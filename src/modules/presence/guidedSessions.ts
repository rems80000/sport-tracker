export type SpokenStep = { at: number; text: string }

export const guidedSessions = [
  {
    id: 'voice-calm', title: 'Revenir au calme', subtitle: 'Une pause pour souffler', minutes: 5,
    description: 'Une voix vous accompagne pour sentir vos appuis, relâcher les épaules et revenir au souffle, avec des pauses silencieuses.',
    tone: 'sage', icon: '≈', ambience: 'forest' as const, voiceGuided: true,
    guidance: [
      { at: 0, text: 'Installez-vous dans une position confortable. Posez les mains et sentez le support sous votre corps. Vous pouvez garder les yeux ouverts, avec un regard tranquille. Pendant ces cinq minutes, il n’y a rien à réussir.' },
      { at: 45, text: 'Portez maintenant votre attention sur la respiration. Sentez l’air qui entre, puis qui ressort. Laissez le souffle suivre son rythme naturel, sans le retenir ni chercher à le rendre plus profond.' },
      { at: 100, text: 'Remarquez vos épaules. Si cela vous convient, laissez-les descendre légèrement. Desserrez la mâchoire et les mains. Il suffit de rendre votre position un peu plus confortable.' },
      { at: 160, text: 'Des pensées sont peut-être arrivées. C’est normal. Remarquez simplement que votre attention est partie, puis retrouvez une sensation du souffle. Recommencez aussi souvent que nécessaire, avec douceur.' },
      { at: 220, text: 'Sentez à nouveau vos appuis et le mouvement de la respiration. Vous pouvez laisser les sons autour de vous être là. Prenez quelques instants de silence, sans rien changer.' },
      { at: 280, text: 'Cette pause se termine. Bougez doucement les doigts et regardez autour de vous. Gardez votre rythme pour reprendre la suite de la journée.' },
    ],
  },
  {
    id: 'voice-body', title: 'Relâcher le corps', subtitle: 'Des pieds jusqu’au visage', minutes: 8,
    description: 'Un parcours vocal progressif du corps, sans mouvement imposé, pour observer les sensations et laisser de la place au relâchement.',
    tone: 'sand', icon: '◌', ambience: 'stream' as const, voiceGuided: true,
    guidance: [
      { at: 0, text: 'Prenez une position qui vous soutient bien, assise ou allongée. Ajustez-la si nécessaire. Nous allons parcourir le corps, des pieds jusqu’au visage. Vous pouvez simplement écouter, sans chercher une sensation particulière.' },
      { at: 60, text: 'Commencez par les pieds. Sentez leur contact, leur température, ou le poids des talons. Il est aussi possible de ne rien sentir de précis. Laissez les pieds se poser, puis observez les chevilles.' },
      { at: 125, text: 'Déplacez votre attention vers les mollets, les genoux et les cuisses. Observez les sensations présentes, sans les corriger. Si une zone est inconfortable, ajustez votre position ou choisissez un autre point d’attention.' },
      { at: 190, text: 'Sentez le bassin et les points de contact avec votre support. Puis remarquez le ventre. Il peut bouger doucement avec le souffle. Vous n’avez pas besoin de le rentrer ni de contrôler son mouvement.' },
      { at: 255, text: 'Portez attention au dos, puis à la poitrine. Laissez la respiration rester naturelle. Imaginez simplement un peu plus d’espace autour des sensations, sans exiger que les tensions disparaissent.' },
      { at: 320, text: 'Remarquez les épaules, les bras et les mains. Desserrez les doigts si vous le souhaitez. Laissez les bras reposer de tout leur poids. Prenez quelques respirations pour rester avec ces sensations.' },
      { at: 385, text: 'Observez maintenant la nuque et le visage. Relâchez doucement le front, le contour des yeux et la mâchoire. La langue peut se poser librement. Accueillez ensuite le corps dans son ensemble.' },
      { at: 455, text: 'Retrouvez les contacts avec le support. Prenez le temps de bouger les mains et les pieds. Quand vous le souhaitez, ouvrez davantage le regard et revenez tranquillement à votre environnement.' },
    ],
  },
  {
    id: 'voice-thoughts', title: 'Faire une pause dans les pensées', subtitle: 'Revenir sans se juger', minutes: 7,
    description: 'Des repères vocaux espacés pour observer les pensées sans les chasser, puis retrouver les sensations du moment.',
    tone: 'blue', icon: '⌁', ambience: 'rain' as const, voiceGuided: true,
    guidance: [
      { at: 0, text: 'Installez-vous et sentez vos appuis. Pendant cette pause, vous n’avez rien à résoudre. Les pensées peuvent continuer à passer. Nous allons simplement apprendre à les remarquer et à revenir au moment présent.' },
      { at: 60, text: 'Choisissez une sensation facile à retrouver : le contact des pieds, le poids des mains, ou le mouvement du souffle. Restez un instant avec ce repère. Il n’a pas besoin d’être intense.' },
      { at: 120, text: 'Si une pensée vous emporte, vous pouvez vous dire intérieurement : une pensée. Sans commenter davantage, revenez au contact des pieds ou des mains. Ce retour compte, même s’il ne dure que quelques secondes.' },
      { at: 185, text: 'Une pensée peut être un souvenir, un projet ou une inquiétude. Vous n’avez pas besoin de la terminer maintenant. Laissez-la être là, puis donnez un peu d’attention à ce que votre corps ressent.' },
      { at: 250, text: 'Écoutez un son autour de vous. Remarquez son apparition, puis sa disparition. Revenez ensuite à votre appui. L’attention peut bouger, et vous pouvez la ramener sans vous faire de reproche.' },
      { at: 315, text: 'Pour les prochaines respirations, laissez de côté l’idée de bien méditer. Sentez simplement le support et le souffle. Quand une pensée revient, accueillez-la puis retrouvez votre repère.' },
      { at: 395, text: 'La séance arrive à sa fin. Regardez autour de vous et reprenez contact avec la pièce. Vous pourrez revenir à ce repère, même pendant quelques secondes, au cours de la journée.' },
    ],
  },
  {
    id: 'voice-energy', title: 'Retrouver son élan', subtitle: 'Une intention simple', minutes: 5,
    description: 'Sentir ses appuis, retrouver une posture confortable et choisir un petit pas pour la suite de la journée.',
    tone: 'sage', icon: '✦', ambience: 'forest' as const, voiceGuided: true,
    guidance: [
      { at: 0, text: 'Posez les pieds et prenez une position confortable. Laissez ce que vous faisiez juste avant attendre quelques minutes. Il ne s’agit pas de vous forcer à être énergique, mais de retrouver un peu de disponibilité.' },
      { at: 45, text: 'Sentez le contact des pieds avec le sol. Si cela vous convient, redressez-vous légèrement, sans raidir le dos. Dégagez les épaules et laissez la respiration circuler à son rythme.' },
      { at: 100, text: 'Remarquez les mains, les pieds et les sons autour de vous. Vous êtes ici. Restez quelques instants avec ces sensations simples, sans chercher à modifier votre humeur.' },
      { at: 160, text: 'Demandez-vous doucement : quel petit pas serait utile après cette pause ? Choisissez quelque chose de concret et de réalisable. Cela peut être commencer une tâche, prendre un verre d’eau ou vous accorder encore du repos.' },
      { at: 220, text: 'Gardez seulement ce premier pas. Vous n’avez pas besoin de prévoir toute la suite. Retrouvez une respiration naturelle et sentez à nouveau les pieds au sol.' },
      { at: 280, text: 'Bougez doucement les mains et ouvrez le regard. Quand vous serez prêt, vous pourrez faire ce petit pas, à votre rythme.' },
    ],
  },
  {
    id: 'voice-night', title: 'Se poser avant la nuit', subtitle: 'Laisser la journée se déposer', minutes: 10,
    description: 'Une voix de plus en plus discrète accompagne le relâchement, puis laisse une longue place au silence et au fond sonore.',
    tone: 'blue', icon: '☾', ambience: 'waves' as const, voiceGuided: true,
    guidance: [
      { at: 0, text: 'Installez-vous confortablement. Vous pouvez réduire la lumière et laisser les yeux se fermer si cela vous convient. Pendant ces minutes, il n’y a plus de tâche à accomplir. Il n’est pas nécessaire non plus de chercher à vous endormir.' },
      { at: 60, text: 'Sentez le poids du corps sur le support. Laissez les pieds, les jambes et le bassin se poser. Ajustez votre position autant que nécessaire pour trouver un peu plus de confort.' },
      { at: 125, text: 'Portez attention au ventre et au dos. Observez simplement le souffle, sans le ralentir de force. Le support peut porter votre poids. Vous pouvez laisser les épaules et les bras se déposer.' },
      { at: 195, text: 'Desserrez doucement la mâchoire et les doigts. Laissez le front se détendre. Si une tension reste présente, vous n’avez rien à lui imposer. Revenez à une zone du corps qui semble plus tranquille.' },
      { at: 275, text: 'Des moments de la journée peuvent revenir. Vous pouvez les reconnaître, puis les laisser de côté pour maintenant. Ramenez doucement l’attention au contact du corps et au mouvement naturel de la respiration.' },
      { at: 370, text: 'Laissez maintenant la voix devenir plus rare. Vous pouvez écouter les sons, sentir le souffle, ou simplement vous reposer. Il n’y a pas de résultat à obtenir.' },
      { at: 480, text: 'Vous pouvez rester ainsi, sans rien ajouter. Je vous laisse maintenant dans le calme. À la fin de cette pause, prenez tout le temps qui vous convient pour vous reposer.' },
    ],
  },
]
