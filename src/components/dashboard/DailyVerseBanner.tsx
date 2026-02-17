import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

const verses = [
  { text: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.', ref: 'Jeremías 29:11' },
  { text: 'Todo lo puedo en Cristo que me fortalece.', ref: 'Filipenses 4:13' },
  { text: 'Jehová es mi pastor; nada me faltará.', ref: 'Salmos 23:1' },
  { text: 'Confía en Jehová con todo tu corazón, y no te apoyes en tu propia prudencia.', ref: 'Proverbios 3:5' },
  { text: 'Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo, porque Jehová tu Dios es el que va contigo.', ref: 'Deuteronomio 31:6' },
  { text: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.', ref: 'Mateo 6:33' },
  { text: 'El Señor es mi luz y mi salvación; ¿de quién temeré?', ref: 'Salmos 27:1' },
  { text: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.', ref: 'Romanos 8:28' },
  { text: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', ref: 'Mateo 11:28' },
  { text: 'Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.', ref: 'Mateo 18:20' },
  { text: 'He aquí, yo estoy a la puerta y llamo; si alguno oye mi voz y abre la puerta, entraré a él.', ref: 'Apocalipsis 3:20' },
  { text: 'No se amolden al mundo actual, sino sean transformados mediante la renovación de su mente.', ref: 'Romanos 12:2' },
  { text: 'Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.', ref: 'Salmos 37:4' },
  { text: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.', ref: 'Salmos 119:105' },
  { text: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.', ref: 'Juan 3:16' },
  { text: 'Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces.', ref: 'Jeremías 33:3' },
  { text: 'Con amor eterno te he amado; por tanto, te prolongué mi misericordia.', ref: 'Jeremías 31:3' },
  { text: 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.', ref: 'Isaías 40:31' },
  { text: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.', ref: 'Isaías 41:10' },
  { text: 'Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.', ref: 'I Tesalonicenses 5:18' },
  { text: 'Yo soy el camino, y la verdad, y la vida; nadie viene al Padre, sino por mí.', ref: 'Juan 14:6' },
  { text: 'Porque nada hay imposible para Dios.', ref: 'Lucas 1:37' },
  { text: 'La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da.', ref: 'Juan 14:27' },
  { text: 'El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.', ref: 'Salmos 91:1' },
  { text: 'Encomienda a Jehová tu camino, y confía en él; y él hará.', ref: 'Salmos 37:5' },
  { text: 'Jehová cumplirá su propósito en mí; tu misericordia, oh Jehová, es para siempre.', ref: 'Salmos 138:8' },
  { text: 'Jehová peleará por vosotros, y vosotros estaréis tranquilos.', ref: 'Éxodo 14:14' },
  { text: 'Sean fuertes y valientes. No teman ni se asusten, porque el Señor su Dios los acompañará.', ref: 'Josué 1:9' },
  { text: 'El amor es paciente, es bondadoso. El amor no es envidioso ni jactancioso ni orgulloso.', ref: '1 Corintios 13:4' },
  { text: 'Grande es tu fidelidad, oh Dios. Tus misericordias son nuevas cada mañana.', ref: 'Lamentaciones 3:23' },
  { text: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes.', ref: 'Josué 1:9' },
];

const getDailyVerse = () => {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return verses[dayOfYear % verses.length];
};

export const DailyVerseBanner = () => {
  const [verse] = useState(getDailyVerse);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/5 via-background to-secondary/5 p-5 animate-slide-up opacity-0" style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Reflexión del día</p>
          <p className="text-sm text-foreground leading-relaxed italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            "{verse.text}"
          </p>
          <p className="text-xs font-semibold text-primary mt-2">— {verse.ref}</p>
        </div>
      </div>
    </div>
  );
};
