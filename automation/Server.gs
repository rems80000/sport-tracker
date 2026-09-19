/* Google Apps Script adapter. engine.ts is bundled above this file by build-automation.mjs. */
const SETTINGS = { sourceList: '@default', calendarId: 'primary', intervalMinutes: 5 };

function installer() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Un traitement est déjà en cours. Réessayez.');
  try {
    const props = PropertiesService.getScriptProperties();
    const source = Tasks.Tasklists.get(SETTINGS.sourceList);
    const startedAt = props.getProperty('startedAt') || new Date().toISOString();
    const shopping = ensureList_(SHOPPING_LIST);
    const notes = ensureList_(NOTES_LIST);
    const service = ensureList_(SERVICE_LIST);
    props.setProperties({ sourceListId: source.id, shoppingListId: shopping.id, notesListId: notes.id, serviceListId: service.id, startedAt });
    const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'traiterDemandes');
    if (!triggers.length) ScriptApp.newTrigger('traiterDemandes').timeBased().everyMinutes(SETTINGS.intervalMinutes).create();
    // Re-running setup is safe; remove only this project's redundant triggers.
    triggers.slice(1).forEach(t => ScriptApp.deleteTrigger(t));
    heartbeat_({ active: true, startedAt, sourceListId: source.id, sourceListTitle: source.title,
      shoppingListId: shopping.id, notesListId: notes.id, lastRun: null, message: 'Installé. Prochain passage dans environ cinq minutes.' });
    console.log('Life Hub activé. Les tâches nouvelles ou modifiées de « ' + source.title + ' » seront examinées toutes les cinq minutes.');
  } finally { lock.releaseLock(); }
}

function arreter() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'traiterDemandes').forEach(t => ScriptApp.deleteTrigger(t));
    heartbeat_({ active: false, lastRun: new Date().toISOString(), message: 'Automatisation arrêtée. Les données sont conservées.' });
  } finally { lock.releaseLock(); }
}

function traiterDemandes() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  const started = Date.now();
  const props = PropertiesService.getScriptProperties();
  const sourceList = props.getProperty('sourceListId');
  let processed = 0, errors = 0;
  try {
    if (!sourceList) throw new Error('Exécutez installer une première fois.');
    // No watermark: a failed item or a batch beyond the time budget is retried next run.
    const tasks = allTasks_(sourceList, { showCompleted: false });
    for (const task of tasks) {
      if (Date.now() - started > 210000 || processed >= 40) break;
      const parsed = unpackNotes(task.notes);
      if (parsed.meta && ['processed', 'review'].includes(parsed.meta.state)) continue;
      if (parsed.meta && parsed.meta.generatedFor) continue;
      if (!parsed.meta && (!task.updated || task.updated < props.getProperty('startedAt'))) continue;
      try {
      let intent = parsed.meta ? parsed.meta.intent : classify(task.title, task.updated || new Date().toISOString());
      const validation = parsed.meta?.plannedAt && intent.kind === 'event' ? null : validateIntent(intent);
      if (validation) {
        saveMeta_(sourceList, task, { version: 1, state: 'review', captureId: parsed.meta?.captureId, intent: Object.assign({}, intent, { reason: validation }) });
        processed++;
        continue;
      }
      // Persist the exact plan before writes, including dates resolved from the original capture.
      const planned = { version: 1, state: 'queued', captureId: parsed.meta?.captureId, plannedAt: parsed.meta?.plannedAt || new Date().toISOString(), intent };
      saveMeta_(sourceList, task, planned);
      try {
        const result = executeIntent_(sourceList, task, intent, props);
        saveMeta_(sourceList, task, Object.assign({}, planned, result, { state: 'processed', processedAt: new Date().toISOString() }), intent.kind !== 'task');
      } catch (error) {
        errors++;
        saveMeta_(sourceList, task, Object.assign({}, planned, { state: 'error', error: String(error.message || error).slice(0, 400) }));
      }
      } catch (error) {
        errors++;
        console.warn('Demande non traitée (' + task.id + ') : ' + String(error.message || error).slice(0, 400));
      }
      processed++;
    }
    heartbeat_({ active: true, lastRun: new Date().toISOString(), message: errors ? errors + ' demande(s) à réessayer.' : 'Dernier passage réussi.', errors });
  } catch (error) {
    heartbeat_({ active: true, lastRun: new Date().toISOString(), message: String(error.message || error).slice(0, 400), errors: errors + 1 });
    throw error;
  } finally { lock.releaseLock(); }
}

function executeIntent_(sourceList, task, intent, props) {
  if (intent.kind === 'task') return {};
  const key = sourceList + ':' + task.id;
  const original = unpackNotes(task.notes).text;
  if (intent.kind === 'event') {
    // Calendar IDs only accept base32hex characters. A SHA256 hexadecimal ID qualifies.
    const id = 'lh' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
    let event;
    try { event = Calendar.Events.get(SETTINGS.calendarId, id); }
    catch (error) { if (!/not found|404/i.test(String(error))) throw error; }
    if (event && event.status === 'cancelled') throw new Error('Le rendez-vous créé a été supprimé du calendrier. Il ne sera pas recréé automatiquement.');
    if (!event && validateIntent(intent)) throw new Error(validateIntent(intent));
    if (!event) event = Calendar.Events.insert({ id, summary: intent.title, description: original,
      start: { dateTime: parisInstant(intent.date, intent.start), timeZone: 'Europe/Paris' },
      end: { dateTime: parisInstant(intent.date, intent.end), timeZone: 'Europe/Paris' },
      extendedProperties: { private: { lifeHubSource: key } } }, SETTINGS.calendarId, { sendUpdates: 'none' });
    return { eventUrl: event.htmlLink };
  }
  const listId = props.getProperty(intent.kind === 'shopping' ? 'shoppingListId' : 'notesListId');
  if (!listId) throw new Error('Liste de destination manquante. Relancez installer.');
  const existing = allTasks_(listId, { showCompleted: true, showHidden: true });
  const titles = intent.kind === 'shopping' ? intent.items : [intent.title];
  const ids = titles.map((title, index) => {
    const outputKey = key + ':' + index;
    let output = existing.find(item => unpackNotes(item.notes).meta?.generatedFor === outputKey);
    if (!output) {
      const notes = packNotes(original, { version: 1, state: 'processed', intent: { kind: intent.kind, title }, generatedFor: outputKey });
      output = Tasks.Tasks.insert({ title, notes }, listId);
      existing.push(output);
    }
    return output.id;
  });
  return { outputListId: listId, outputIds: ids };
}

function saveMeta_(listId, task, meta, complete) {
  const patch = { notes: packNotes(unpackNotes(task.notes).text, meta) };
  if (complete) patch.status = 'completed';
  Tasks.Tasks.patch(patch, listId, task.id);
}

function allTasks_(listId, options) {
  let items = [], pageToken;
  do {
    const page = Tasks.Tasks.list(listId, Object.assign({ maxResults: 100 }, options, pageToken ? { pageToken } : {}));
    items = items.concat(page.items || []);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items.filter(task => !task.deleted);
}

function ensureList_(title) {
  let pageToken;
  do {
    const page = Tasks.Tasklists.list(Object.assign({ maxResults: 100 }, pageToken ? { pageToken } : {}));
    const found = (page.items || []).find(list => list.title === title);
    if (found) return found;
    pageToken = page.nextPageToken;
  } while (pageToken);
  return Tasks.Tasklists.insert({ title });
}

function heartbeat_(update) {
  const props = PropertiesService.getScriptProperties();
  const listId = props.getProperty('serviceListId');
  if (!listId) return;
  const health = Object.assign({}, JSON.parse(props.getProperty('health') || '{}'), update);
  props.setProperty('health', JSON.stringify(health));
  const existing = allTasks_(listId, { showCompleted: true, showHidden: true }).find(task => task.title === 'État de l’automatisation');
  const payload = { title: 'État de l’automatisation', notes: JSON.stringify(health), status: 'needsAction' };
  if (existing) Tasks.Tasks.patch(payload, listId, existing.id);
  else Tasks.Tasks.insert(payload, listId);
}
