import { useState } from 'react'
import type { StoredMediaRef } from './mediaStore'
import { useMediaUrl } from './useMediaUrl'

export function TabDocument({ file, zoom }: { file: StoredMediaRef; zoom: number }) {
  const media = useMediaUrl(file.id)
  const [failedImage, setFailedImage] = useState('')
  if (media.error) return <p role="alert" className="guitar-error">{media.error}</p>
  if (!media.url) return <p role="status">Chargement de la tablature…</p>
  return <>
    <div className="guitar-document-actions"><span>{file.name}</span><a href={media.url} target="_blank" rel="noreferrer">Ouvrir en grand</a><a href={media.url} download={file.name}>Télécharger</a></div>
    {file.kind === 'pdf' ? <object aria-label="Tablature PDF" data={media.url} type="application/pdf" className="guitar-pdf"><p>Ce navigateur ne propose pas de lecteur PDF intégré. Utilisez « Ouvrir en grand » ou « Télécharger ».</p></object> : failedImage === file.id ? <p role="alert" className="guitar-error">Cette image ne peut pas être affichée. Vérifiez le fichier puis importez-le à nouveau. Vous pouvez aussi essayer « Ouvrir en grand » ou « Télécharger ».</p> : <img className="guitar-tab-image" src={media.url} onError={() => setFailedImage(file.id)} style={{ width: `${zoom}%` }} alt={`Tablature : ${file.name}`} />}
  </>
}
