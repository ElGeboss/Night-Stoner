// Night Stoner: Dream Dungeon - prototipe Tahap 1
// Mode uji: tambahkan ?uji di alamat. Dalam mode ini 1 menit dianggap 1 jam.

const UJI = new URLSearchParams(location.search).has("uji");
const JAM_MS = UJI ? 60 * 1000 : 60 * 60 * 1000;
const MIN_BANGUN_JAM = 4;
const TIDUR_PENUH_JAM = 6;
const MAKS_MALAM_JAM = 12;
const JEDA_BATAL_MS = 2 * 60 * 1000;
const PELUANG_DREAM_MEADOW = 0.3;
const KUNCI_SIMPAN = "nightstoner-proto-v1";

// Bobot total 102. Nanti pindah ke server bersama logika malam.
const kejadian = [
  { teks: "Lorong sepi. Tidak ada yang terjadi, tapi langkahmu terdengar aneh.", bobot: 20, koin: 1, relik: 0 },
  { teks: "Koin tersembunyi di retakan dinding.", bobot: 15, koin: 3, relik: 0 },
  { teks: "Jebakan paku di lantai. Untung tidak kena.", bobot: 10, koin: 0, relik: 0 },
  { teks: "Kawanan tikus gua mengintai, lalu kabur sendiri.", bobot: 10, koin: 2, relik: 0 },
  { teks: "Kamp yang ditinggalkan. Ada sisa perbekalan.", bobot: 10, koin: 2, relik: 0 },
  { teks: "Peti terkunci berdiri di sudut ruangan.", bobot: 8, koin: 3, relik: 0 },
  { teks: "Pedagang misterius menawarkan relik acak.", bobot: 5, koin: 0, relik: 1 },
  { teks: "Dari balik peti terdengar napas pelan.", bobot: 5, koin: 4, relik: 0 },
  { teks: "Jembatan rapuh berderit, tapi kalian lewat dengan selamat.", bobot: 5, koin: 2, relik: 0 },
  { teks: "Catatan tua menceritakan dungeon ini dulunya sebuah kebun.", bobot: 4, koin: 1, relik: 0 },
  { teks: "Golem tidur bangkit sebentar, lalu tidur lagi.", bobot: 3, koin: 5, relik: 0 },
  { teks: "Altar cahaya memulihkan semua tenaga timmu.", bobot: 2, koin: 0, relik: 0 },
  { teks: "Teman mimpi lain menyapa dan meninggalkan pesan kecil.", bobot: 2, koin: 2, relik: 0 },
  { teks: "Ruang harta tersembunyi di balik tirai kabut.", bobot: 2, koin: 6, relik: 1 },
  { teks: "Pahlawanmu melihat dirinya sendiri menari di bawah bulan.", bobot: 1, koin: 3, relik: 0 },
];

const el = {
  status: document.getElementById("status"),
  aksi: document.getElementById("aksi"),
  jurnal: document.getElementById("jurnal"),
  koin: document.getElementById("koin"),
};

// ---------- penyimpanan ----------

function kondisiAwal() {
  return {
    koin: 0,
    relik: 0,
    dreamMeadow: 0,
    malam: null,
    tanggalMalam: null,
    jurnal: null,
    tanggalJurnal: null,
  };
}

function muat() {
  try {
    return { ...kondisiAwal(), ...JSON.parse(localStorage.getItem(KUNCI_SIMPAN)) };
  } catch (e) {
    return kondisiAwal();
  }
}

let s = muat();

function simpan() {
  localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(s));
}

function hariIni() {
  const d = new Date();
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const tgl = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${tgl}`;
}

// ---------- waktu ----------

function durasiMalamMs() {
  return s.malam ? Date.now() - s.malam.mulai : 0;
}

function jamTidur(ms) {
  return ms / JAM_MS;
}

// ---------- aksi pemain ----------

function mulaiTidur() {
  if (s.malam || s.tanggalMalam === hariIni()) return;
  s.malam = { mulai: Date.now() };
  s.tanggalMalam = hariIni();
  simpan();
  render();
}

function batalkan() {
  // Salah tekan dalam jeda: malam dibatalkan dan tidak dihitung.
  if (!s.malam || durasiMalamMs() >= JEDA_BATAL_MS) return;
  s.malam = null;
  s.tanggalMalam = null;
  simpan();
  render();
}

function sudahBangun() {
  if (!s.malam) return;
  if (jamTidur(durasiMalamMs()) < MIN_BANGUN_JAM) return;
  selesaikanMalam(false);
}

function selesaikanMalam(otomatis) {
  const jam = Math.min(jamTidur(durasiMalamMs()), MAKS_MALAM_JAM);
  const hasil = buatJurnal(jam, otomatis);

  s.koin += hasil.koin;
  s.relik += hasil.relik;
  if (hasil.dreamMeadow) s.dreamMeadow += 1;
  s.jurnal = hasil.baris;
  s.tanggalJurnal = hariIni();
  s.malam = null;

  simpan();
  render();
}

function cekMalamOtomatis() {
  if (s.malam && jamTidur(durasiMalamMs()) >= MAKS_MALAM_JAM) {
    selesaikanMalam(true);
  }
}

// ---------- kejadian dan jurnal ----------

function acakKejadian() {
  const total = kejadian.reduce((a, k) => a + k.bobot, 0);
  let r = Math.random() * total;
  for (const k of kejadian) {
    r -= k.bobot;
    if (r < 0) return k;
  }
  return kejadian[0];
}

function buatJurnal(jam, otomatis) {
  const penuh = jam >= TIDUR_PENUH_JAM;

  // Satu kejadian tiap 45 menit, maksimal 10. Bangun lebih awal hanya dapat sekitar 65%.
  let jumlah = Math.min(10, Math.floor((jam * 60) / 45));
  if (!penuh) jumlah = Math.floor(jumlah * 0.65);

  const baris = [];
  if (otomatis) {
    baris.push("Kamu tidak sempat bangun. Tim pulang sendiri dan menceritakan malamnya.");
  } else if (penuh) {
    baris.push("Malam yang nyenyak. Tim menjelajah sampai ujung dungeon.");
  } else {
    baris.push("Kamu bangun lebih awal. Tim baru separuh jalan ketika kamu terbangun.");
  }

  let koin = 0;
  let relik = 0;
  for (let i = 0; i < jumlah; i++) {
    const k = acakKejadian();
    baris.push(k.teks);
    koin += k.koin;
    relik += k.relik;
  }

  // Dream Meadow hanya peluang, dan hanya untuk tidur penuh.
  const dreamMeadow = penuh && Math.random() < PELUANG_DREAM_MEADOW;
  if (dreamMeadow) {
    baris.push("Dream Meadow terbuka! Padang bunga berkilau dan kupu-kupu biru menyambutmu.");
    relik += 1;
  }

  return { baris, koin, relik, dreamMeadow };
}

// ---------- tampilan ----------

function buatTombol(teks, aksi, kelas, nonaktif) {
  const b = document.createElement("button");
  b.textContent = teks;
  if (kelas) b.className = kelas;
  b.disabled = Boolean(nonaktif);
  b.addEventListener("click", aksi);
  return b;
}

function paragraf(teks, kelas) {
  const p = document.createElement("p");
  p.textContent = teks;
  if (kelas) p.className = kelas;
  return p;
}

function render() {
  el.status.replaceChildren();
  el.aksi.replaceChildren();
  el.jurnal.replaceChildren();
  el.jurnal.hidden = true;

  el.koin.textContent =
    `Koin ${s.koin} · Relik ${s.relik} · Dream Meadow ${s.dreamMeadow}` +
    (UJI ? " · mode uji" : "");

  if (s.malam) {
    const ms = durasiMalamMs();
    const jam = jamTidur(ms);

    el.status.append(
      paragraf("Pahlawanmu sedang bermimpi", "judul"),
      paragraf(`Sudah tidur ${jam.toFixed(1)} jam.`)
    );

    if (ms < JEDA_BATAL_MS) {
      const sisa = Math.ceil((JEDA_BATAL_MS - ms) / 1000);
      el.status.append(paragraf(`Salah tekan? Kamu bisa batalkan dalam ${sisa} detik.`, "kecil"));
      el.aksi.append(buatTombol("Batalkan", batalkan, "sekunder", false));
    }

    const bisaBangun = jam >= MIN_BANGUN_JAM;
    el.aksi.append(buatTombol("Sudah Bangun", sudahBangun, "utama", !bisaBangun));
    if (!bisaBangun) {
      el.status.append(paragraf(`Tombol bangun aktif setelah ${MIN_BANGUN_JAM} jam.`, "kecil"));
    }
    return;
  }

  if (s.tanggalJurnal === hariIni() && s.jurnal) {
    el.jurnal.hidden = false;
    el.jurnal.append(paragraf("Jurnal Pagi", "judul"));
    s.jurnal.forEach((t) => el.jurnal.append(paragraf(t, "baris")));
    el.status.append(paragraf("Selamat pagi. Sampai malam berikutnya."));
    return;
  }

  if (s.tanggalMalam === hariIni()) {
    el.status.append(paragraf("Malam hari ini sudah selesai. Sampai besok."));
    return;
  }

  el.status.append(
    paragraf("Selamat malam", "judul"),
    paragraf("Pahlawanmu menunggu di gerbang mimpi.")
  );
  el.aksi.append(buatTombol("Mulai Tidur", mulaiTidur, "utama", false));
}

// ---------- mulai ----------

cekMalamOtomatis();
render();

setInterval(() => {
  if (s.malam) {
    cekMalamOtomatis();
    render();
  }
}, 15000);
