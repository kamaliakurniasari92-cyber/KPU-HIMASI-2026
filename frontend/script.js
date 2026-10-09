/* ========================================= */
/* KONFIGURASI API */
/* ========================================= */

// Saat tes lokal pakai localhost, setelah deploy ganti ke URL Railway (pakai https://)
const API_URL = "http://localhost:3000";


/* ========================================= */
/* CEK LOGIN & ROLE */
/* ========================================= */

const role = sessionStorage.getItem("role");

// Belum pilih role -> kembali ke halaman login
if (!role) {
    location.href = "login.html";
}

const isAdmin = role === "admin";

if (!isAdmin) {
    document.body.classList.add("guest");
}

document.getElementById("labelRole").textContent =
    isAdmin ? "Masuk sebagai Admin" : "Masuk sebagai Mahasiswa";


function keluar() {
    sessionStorage.clear();
    location.href = "login.html";
}


/* ========================================= */
/* VARIABEL SUARA */
/* ========================================= */

let suara01 = 0;
let suara02 = 0;

// Paslon yang sedang dipilih
let paslonDipilih = 0;

// "tambah" = menambah suara, "kurang" = mengurangi suara
let jenisAksi = "";


/* ========================================= */
/* CHART */
/* ========================================= */

const ctx = document
    .getElementById("diagramSuara")
    .getContext("2d");


const diagramSuara = new Chart(ctx, {

    type: "bar",

    data: {

        labels: [
            "PASLON 01",
            "PASLON 02"
        ],

        datasets: [
            {
                label: "Jumlah Suara",
                data: [suara01, suara02],
                borderWidth: 1
            }
        ]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        scales: {

            y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
                title: {
                    display: true,
                    text: "JUMLAH SUARA"
                }
            },

            x: {
                title: {
                    display: true,
                    text: "PASANGAN CALON"
                }
            }

        },

        plugins: {
            legend: { display: false }
        }

    }

});


/* ========================================= */
/* TAMPILKAN DATA DARI SERVER */
/* ========================================= */

function tampilkanData(data) {

    suara01 = data.find(p => p.id === 1).suara;
    suara02 = data.find(p => p.id === 2).suara;

    document.getElementById("suara01").textContent = suara01;
    document.getElementById("suara02").textContent = suara02;

    updateDiagram();

}


/* ========================================= */
/* MUAT DATA SAAT HALAMAN DIBUKA */
/* ========================================= */

async function muatData() {

    try {

        const res = await fetch(API_URL + "/api/suara");

        tampilkanData(await res.json());

    } catch (err) {

        alert("Gagal memuat data dari server");

    }

}


/* ========================================= */
/* POPUP TAMBAH SUARA */
/* ========================================= */

function tampilkanKonfirmasi(paslon) {

    // Guest tidak boleh mengubah suara
    if (!isAdmin) {
        return;
    }

    paslonDipilih = paslon;

    jenisAksi = "tambah";

    document.getElementById("judulKonfirmasi").textContent =
        "SUARA SAH?";

    document.getElementById("pesanKonfirmasi").textContent =
        "Apakah suara untuk Paslon 0" + paslon + " sah?";

    document.getElementById("btnKonfirmasi").textContent =
        "YA, SUARA SAH";

    document.getElementById("popupKonfirmasi").style.display = "flex";

}


/* ========================================= */
/* POPUP KURANG SUARA */
/* ========================================= */

function tampilkanKonfirmasiKurang(paslon) {

    // Guest tidak boleh mengubah suara
    if (!isAdmin) {
        return;
    }

    // Jangan tampilkan popup jika suara masih 0
    if (paslon === 1 && suara01 === 0) {
        return;
    }

    if (paslon === 2 && suara02 === 0) {
        return;
    }

    paslonDipilih = paslon;

    jenisAksi = "kurang";

    document.getElementById("judulKonfirmasi").textContent =
        "KURANGI SUARA?";

    document.getElementById("pesanKonfirmasi").textContent =
        "Apakah ingin mengurangi 1 suara Paslon 0" + paslon + "?";

    document.getElementById("btnKonfirmasi").textContent =
        "YA, KURANGI";

    document.getElementById("popupKonfirmasi").style.display = "flex";

}


/* ========================================= */
/* KONFIRMASI AKSI (KIRIM KE SERVER) */
/* ========================================= */

async function konfirmasiAksi() {

    const endpoint = jenisAksi === "tambah" ? "tambah" : "kurang";

    const paslon = paslonDipilih;

    // Tutup popup dulu supaya tidak diklik dua kali
    tutupPopup();

    try {

        const res = await fetch(
            `${API_URL}/api/suara/${paslon}/${endpoint}`,
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + sessionStorage.getItem("token")
                }
            }
        );

        if (res.status === 401) {

            // Sesi habis / token tidak valid -> login ulang
            alert("Sesi admin habis, silakan login ulang.");

            keluar();

        } else if (!res.ok) {

            alert("Gagal menyimpan suara");

        } else {

            // Server mengembalikan data terbaru
            tampilkanData(await res.json());

        }

    } catch (err) {

        alert("Tidak bisa terhubung ke server");

    }

}


/* ========================================= */
/* TUTUP POPUP */
/* ========================================= */

function tutupPopup() {

    document
        .getElementById("popupKonfirmasi")
        .style.display = "none";

    paslonDipilih = 0;

    jenisAksi = "";

}


/* ========================================= */
/* TOMBOL KURANG */
/* ========================================= */

function kurangiSuara(paslon) {

    // Tombol hanya membuka popup, tidak langsung mengurangi
    tampilkanKonfirmasiKurang(paslon);

}


/* ========================================= */
/* UPDATE DIAGRAM */
/* ========================================= */

function updateDiagram() {

    diagramSuara.data.datasets[0].data = [suara01, suara02];

    diagramSuara.update();

}


/* ========================================= */
/* JALANKAN SAAT HALAMAN DIBUKA */
/* ========================================= */

muatData();