import type { StoredMediaRef } from './mediaStore'
import { useMediaUrl } from './useMediaUrl'

export function TabDocument({ file, zoom }: { file: StoredMediaRef; zoom: number }) {
  const media = useMediaUrl(file.id)
  if (media.error) return <p role="alert" className="guitar-error">{media.error}</p>
  if (!media.url) return <p role="status">Chargement de la tablature…</p>
  return <>
    <div className="guitar-document-actions"><span>{file.name}</span><a href={media.url} target="_blank" rel="noreferrer">Ouvrir en grand</a><a href={media.url} download={file.name}>Télécharger</a></div>
    {file.kind === 'pdf' ? <object aria-label="Tablature PDF" data={media.url} type="application/pdf" className="guitar-pdf"><p>Ce navigateur ne propose pas de lecteur PDF intégré. Utilisez « Ouvrir en grand » ou « Télécharger ».</p></object> : <img className="guitar-tab-image" src={media.url} style={{ width: `${zoom}%` }} alt={`Tablature : ${file.name}`} />}
  </>
}
