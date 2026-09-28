import { readFileSync, writeFileSync } from 'node:fs';

const f = 'src/pages/KelolaModul.tsx';
let c = readFileSync(f, 'utf8');

c = c.replace(
  /setJalurForm\(\{ kode: '', label: '', deskripsi: '' \}\)/g,
  "setJalurForm({ kode: '', label: '', deskripsi: '', urutan: 99, aktif: true })",
);
c = c.replace(
  "import { ChevronDown, Plus, Eye, X, Pencil, Trash2, Route } from 'lucide-react';",
  "import { ChevronDown, Plus, Eye, X, Pencil, Trash2 } from 'lucide-react';",
);
c = c.replace(
  "setJalurForm({ kode: j.kode, label: j.label, deskripsi: j.deskripsi ?? '' });",
  "setJalurForm({ kode: j.kode, label: j.label, deskripsi: j.deskripsi ?? '', urutan: j.urutan, aktif: j.aktif });",
);

writeFileSync(f, c, 'utf8');
console.log('patched');
