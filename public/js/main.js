// ========================================
// GLOBAL DEGISKENLER
// ========================================
const API_URL = window.location.origin + '/api';

let selectedBarber = null;
let selectedDate = null;
let selectedTime = null;
let currentWeekStart = new Date();
let currentMonth = new Date();
let barbersData = [];
let currentStep = 1; // Track the current step in Randevu flow

// Calisma saatleri (09:00 - 21:00)
const workingHours = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
];

// Gun isimleri
const dayNames = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];
const dayNamesFull = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
const monthNames = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
    'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

// Fullscreen galeri state
let fullscreenPhotos = [];
let fullscreenIndex = 0;

// ========================================
// SAYFA YUKLENDIKTEN SONRA
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    loadBarbers();
    initCalendar();
    initFormNavigation();
    initViewSelector();
    initFullscreenViewer();

    // Haftanin baslangicini pazartesi yap
    setWeekStart();
    renderWeeklyCalendar();
    renderMonthlyCalendar();

    // Portal check (URL hash'e gore admin sayfasina veya belirli bolume mi gitmeli?)
    checkUrlHash();
});

function checkUrlHash() {
    const hash = window.location.hash;
    if (hash === '#randevu') openRandevu();
    else if (hash === '#market') openMarket();
    else if (hash === '#galeri') openGaleri();
}

// ========================================
// PORTAL NAVIGASYONU
// ========================================
async function openRandevu() {
    hideAllMainViews();
    await loadBarbers(); // Berber listesi ve fotograflarini guncelle
    document.getElementById('portalScreen').classList.add('hidden');
    document.getElementById('mainHeader').style.display = 'block';
    document.getElementById('mainRandevu').style.display = 'block';
}

function openMarket() {
    hideAllMainViews();
    document.getElementById('portalScreen').classList.add('hidden');
    document.getElementById('mainHeader').style.display = 'block';
    document.getElementById('mainMarket').style.display = 'block';
    renderMarket();
}

async function openGaleri() {
    hideAllMainViews();
    await loadBarbers(); // En guncel verileri cek (yeni yuklenen fotograflar dahil)
    document.getElementById('portalScreen').classList.add('hidden');
    document.getElementById('mainHeader').style.display = 'block';
    document.getElementById('mainGaleri').style.display = 'block';
    renderGlobalGallery();
}

function backToPortal() {
    // If we are in the Randevu flow and past step 1, go back to step 1 instead of portal
    const isRandevuVisible = document.getElementById('mainRandevu').style.display === 'block';

    if (isRandevuVisible && currentStep > 1) {
        goToStep(1);
        return;
    }

    document.getElementById('portalScreen').classList.remove('hidden');
    document.getElementById('mainHeader').style.display = 'none';
    hideAllMainViews();
}

function hideAllMainViews() {
    document.getElementById('mainRandevu').style.display = 'none';
    document.getElementById('mainMarket').style.display = 'none';
    document.getElementById('mainGaleri').style.display = 'none';
}

// ========================================
// MARKET VE GLOBAL GALERI RENDER
// ========================================
function renderMarket() {
    const grid = document.getElementById('marketGrid');
    // Simdilik statik, sonra API'dan gelecek
    const products = [
        { name: 'Özel Sakal Yağı', price: '250 TL', icon: '🧴' },
        { name: '045 Oversize T-Shirt', price: '750 TL', icon: '👕' },
        { name: 'Mat Wax (Seri 045)', price: '320 TL', icon: '💆‍♂️' },
        { name: '045 Premium Parfüm', price: '1200 TL', icon: '💨' }
    ];

    grid.innerHTML = products.map(p => `
        <div class="product-card reveal-init">
            <div class="product-img">${p.icon}</div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="product-price">${p.price}</div>
                <button class="btn-order-whatsapp" onclick="orderProduct('${p.name}')">WP Sipariş</button>
            </div>
        </div>
    `).join('');
}

let globalGalleryPhotos = [];

function renderGlobalGallery() {
    const grid = document.getElementById('globalGalleryGrid');
    globalGalleryPhotos = [];

    barbersData.forEach(barber => {
        if (barber.photos) {
            barber.photos.forEach(photo => {
                globalGalleryPhotos.push({ url: photo, barber: barber.name });
            });
        }
    });

    if (globalGalleryPhotos.length === 0) {
        grid.innerHTML = '<div class="gallery-empty">Henüz fotoğraf eklenmemiş</div>';
        return;
    }

    grid.innerHTML = globalGalleryPhotos.map((item, idx) => `
        <div class="gallery-photo reveal-init" onclick="openFullscreenGlobal(${idx})">
            <img src="/uploads/${item.url}" alt="${item.barber}'s Work">
            <div class="photo-info">${item.barber}</div>
        </div>
    `).join('');
}

function openFullscreenGlobal(idx) {
    const urls = globalGalleryPhotos.map(p => p.url);
    openFullscreen(urls, idx);
}

function orderProduct(name) {
    const message = `Merhaba, 045 Market'ten "${name}" ürünü hakkında bilgi almak istiyorum. 💈`;
    const wpUrl = `https://wa.me/905436653045?text=${encodeURIComponent(message)}`;
    window.open(wpUrl, '_blank');
}

// ========================================
// BERBER YUKLE VE RENDER
// ========================================
async function loadBarbers() {
    try {
        const response = await fetch(`${API_URL}/barbers`);
        if (response.ok) {
            const data = await response.json();

            // Berber Siralamasi: Muhammed, Cengo, Rio, Ahmet
            const sortOrder = { 'Muhammed': 1, 'Cengo': 2, 'Rio': 3, 'Ahmet': 4 };
            barbersData = data.sort((a, b) => (sortOrder[a.name] || 99) - (sortOrder[b.name] || 99));
        }
    } catch (error) {
        console.log('API baglantisi yok, varsayilan veriler');
        barbersData = [
            { id: 1, name: 'Muhammed', role: 'patron', photos: ['muhammed.jpg'] },
            { id: 2, name: 'Cengo', role: 'berber', photos: ['cengo.jpg'] },
            { id: 3, name: 'Rio', role: 'berber', photos: ['rio.jpg'] },
            { id: 4, name: 'Ahmet', role: 'berber', photos: ['ahmet.jpg'] }
        ].sort((a, b) => {
            const sortOrder = { 'Muhammed': 1, 'Cengo': 2, 'Rio': 3, 'Ahmet': 4 };
            return sortOrder[a.name] - sortOrder[b.name];
        });
    }

    renderBarberCards();
}

function renderBarberCards() {
    const grid = document.getElementById('barberGrid');
    grid.innerHTML = barbersData.map(barber => {
        const roleLabel = barber.role === 'patron' ? 'Patron' : 'Usta Berber';
        const roleClass = barber.role === 'patron' ? 'patron' : 'usta';
        const hasPhoto = barber.photos && barber.photos.length > 0;
        const avatarContent = hasPhoto
            ? `<img src="/uploads/${barber.photos[0]}" alt="${barber.name}">`
            : `<span style="font-size: 1.5rem; color: #6e6e6e;">&#9986;</span>`;

        return `
            <div class="barber-card" data-barber-id="${barber.id}">
                <div class="barber-avatar">
                    ${avatarContent}
                </div>
                <h3>${barber.name}</h3>
                <span class="barber-role ${roleClass}">${roleLabel}</span>
                <p class="barber-exp"></p>
            </div>
        `;
    }).join('');

    initBarberSelection();
}

// ========================================
// BERBER SECIMI
// ========================================
function initBarberSelection() {
    const barberCards = document.querySelectorAll('.barber-card');

    barberCards.forEach(card => {
        card.addEventListener('click', function () {
            // Onceki secimi kaldir
            barberCards.forEach(c => c.classList.remove('selected'));

            // Yeni secimi ekle
            this.classList.add('selected');
            const barberId = parseInt(this.dataset.barberId);
            const barberData = barbersData.find(b => b.id === barberId);

            selectedBarber = {
                id: barberId,
                name: this.querySelector('h3').textContent,
                role: this.querySelector('.barber-role').textContent
            };

            // Fotograflari olan berber icin galeri goster
            if (barberData && barberData.photos && barberData.photos.length > 0) {
                showBarberGallery(barberData);
            } else {
                // Fotografi yoksa direkt sonraki adima gec
                hideBarberGallery();
                setTimeout(() => goToStep(2), 300);
            }
        });
    });
}

// ========================================
// BERBER GALERISI
// ========================================
function showBarberGallery(barber) {
    const section = document.getElementById('barberGallerySection');
    const gallery = document.getElementById('barberGallery');
    const title = document.getElementById('galleryTitle');

    title.textContent = `${barber.name} - Galeri`;

    if (barber.photos && barber.photos.length > 0) {
        gallery.innerHTML = barber.photos.map((photo, index) => `
            <div class="gallery-photo" data-index="${index}">
                <img src="/uploads/${photo}" alt="${barber.name} - ${index + 1}">
            </div>
        `).join('');

        // Fotograf tiklaninca tam ekran
        gallery.querySelectorAll('.gallery-photo').forEach(photoEl => {
            photoEl.addEventListener('click', function () {
                const idx = parseInt(this.dataset.index);
                openFullscreen(barber.photos, idx);
            });
        });
    } else {
        gallery.innerHTML = '<div class="gallery-empty">Henuz fotograf eklenmemis</div>';
    }

    section.style.display = 'block';

    // Galeriye scroll
    setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Randevu al butonu
    document.getElementById('btnBookBarber').onclick = function () {
        hideBarberGallery();
        goToStep(2);
    };

    // Geri don butonu
    document.getElementById('btnBackGallery').onclick = function () {
        hideBarberGallery();
        selectedBarber = null;
        document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
    };
}

function hideBarberGallery() {
    document.getElementById('barberGallerySection').style.display = 'none';
}

// ========================================
// FULLSCREEN GORUNTULEME
// ========================================
function initFullscreenViewer() {
    document.getElementById('fullscreenClose').addEventListener('click', closeFullscreen);
    document.getElementById('fullscreenPrev').addEventListener('click', () => navigateFullscreen(-1));
    document.getElementById('fullscreenNext').addEventListener('click', () => navigateFullscreen(1));

    document.getElementById('fullscreenViewer').addEventListener('click', function (e) {
        if (e.target === this) closeFullscreen();
    });

    // Klavye navigasyonu
    document.addEventListener('keydown', function (e) {
        const viewer = document.getElementById('fullscreenViewer');
        if (!viewer.classList.contains('active')) return;

        if (e.key === 'Escape') closeFullscreen();
        if (e.key === 'ArrowLeft') navigateFullscreen(-1);
        if (e.key === 'ArrowRight') navigateFullscreen(1);
    });
}

function openFullscreen(photos, index) {
    fullscreenPhotos = photos;
    fullscreenIndex = index;

    const viewer = document.getElementById('fullscreenViewer');
    document.getElementById('fullscreenImg').src = `/uploads/${photos[index]}`;
    viewer.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Tek foto varsa nav butonlari gizle
    document.getElementById('fullscreenPrev').style.display = photos.length > 1 ? 'flex' : 'none';
    document.getElementById('fullscreenNext').style.display = photos.length > 1 ? 'flex' : 'none';
}

function closeFullscreen() {
    document.getElementById('fullscreenViewer').classList.remove('active');
    document.body.style.overflow = '';
}

function navigateFullscreen(direction) {
    fullscreenIndex += direction;
    if (fullscreenIndex < 0) fullscreenIndex = fullscreenPhotos.length - 1;
    if (fullscreenIndex >= fullscreenPhotos.length) fullscreenIndex = 0;
    document.getElementById('fullscreenImg').src = `/uploads/${fullscreenPhotos[fullscreenIndex]}`;
}

// ========================================
// TAKVIM ISLEMLERI
// ========================================
function setWeekStart() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Pazartesiye git
    currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() + diff);
    currentWeekStart.setHours(0, 0, 0, 0);
}

function initCalendar() {
    // Haftalik navigasyon
    document.querySelector('.prev-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeeklyCalendar();
    });

    document.querySelector('.next-week').addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeeklyCalendar();
    });

    // Aylik navigasyon
    document.querySelector('.prev-month').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderMonthlyCalendar();
    });

    document.querySelector('.next-month').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderMonthlyCalendar();
    });
}

function renderWeeklyCalendar() {
    const container = document.getElementById('weekDays');
    container.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hafta basligini guncelle
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    document.querySelector('.week-title').textContent =
        `${currentWeekStart.getDate()} - ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}`;

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';

        // Pazar gununu veya gecmis gunleri devre disi birak
        const isPast = date < today;
        const isSunday = date.getDay() === 0;

        if (isPast || isSunday) {
            dayCard.classList.add('disabled');
        }

        dayCard.innerHTML = `
            <div class="day-name">${dayNames[date.getDay()]}</div>
            <div class="day-num">${date.getDate()}</div>
        `;

        dayCard.dataset.date = formatDate(date);

        if (!isPast && !isSunday) {
            dayCard.addEventListener('click', () => selectDate(dayCard, date));
        }

        container.appendChild(dayCard);
    }
}

function renderMonthlyCalendar() {
    const container = document.getElementById('monthDays');
    container.innerHTML = '';

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Ay basligini guncelle
    document.querySelector('.month-title').textContent =
        `${monthNames[month]} ${year}`;

    // Gun basliklarini ekle
    const headers = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
    headers.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        container.appendChild(header);
    });

    // Ayin ilk gunu
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1; // Pazartesi = 0
    if (startDay < 0) startDay = 6; // Pazar icin

    // Ayin son gunu
    const lastDay = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Bos gunler
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'month-day empty';
        container.appendChild(emptyDay);
    }

    // Ayin gunleri
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dayEl = document.createElement('div');
        dayEl.className = 'month-day';
        dayEl.textContent = day;

        const isPast = date < today;
        const isSunday = date.getDay() === 0;
        const isToday = date.getTime() === today.getTime();

        if (isPast || isSunday) {
            dayEl.classList.add('disabled');
        }

        if (isToday) {
            dayEl.classList.add('today');
        }

        dayEl.dataset.date = formatDate(date);

        if (!isPast && !isSunday) {
            dayEl.addEventListener('click', () => selectDateFromMonth(dayEl, date));
        }

        container.appendChild(dayEl);
    }
}

function selectDate(dayCard, date) {
    // Onceki secimi kaldir
    document.querySelectorAll('.day-card').forEach(c => c.classList.remove('selected'));

    // Yeni secimi ekle
    dayCard.classList.add('selected');
    selectedDate = date;

    // Saat secimini goster
    showTimeSlots(date);
}

function selectDateFromMonth(dayEl, date) {
    // Onceki secimi kaldir
    document.querySelectorAll('.month-day').forEach(c => c.classList.remove('selected'));

    // Yeni secimi ekle
    dayEl.classList.add('selected');
    selectedDate = date;

    // Saat secimini goster
    showTimeSlots(date);
}

// Tum berberlerin dolu saatlerini tutar
let allBookedSlots = {};

async function showTimeSlots(date) {
    const container = document.getElementById('timeSlots');
    const timeSection = document.getElementById('timeSelection');

    // Tarihi goster
    document.getElementById('selectedDate').textContent =
        `${date.getDate()} ${monthNames[date.getMonth()]} ${dayNamesFull[date.getDay()]}`;

    timeSection.style.display = 'block';
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    // Secilen berberin dolu randevularini al
    let bookedSlots = [];
    allBookedSlots = {}; // Sifirla

    try {
        // Secilen berberin randevulari
        const response = await fetch(
            `${API_URL}/appointments?barberId=${selectedBarber.id}&date=${formatDate(date)}`
        );
        if (response.ok) {
            const data = await response.json();
            bookedSlots = data.map(a => a.time);
        }

        // Tum berberlerin randevularini al (oneriler icin)
        const allResponse = await fetch(
            `${API_URL}/appointments?date=${formatDate(date)}`
        );
        if (allResponse.ok) {
            const allData = await allResponse.json();
            // Berber bazinda grupla
            allData.forEach(apt => {
                if (!allBookedSlots[apt.barberId]) {
                    allBookedSlots[apt.barberId] = [];
                }
                allBookedSlots[apt.barberId].push(apt.time);
            });
        }
    } catch (error) {
        console.log('API baglantisi yok, demo mod aktif');
    }

    container.innerHTML = '';

    // Bugunun saatini kontrol et
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    workingHours.forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = time;

        // Gecmis saatleri veya dolu saatleri devre disi birak
        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = new Date(date);
        slotTime.setHours(hours, minutes, 0, 0);

        const isPast = isToday && slotTime < now;
        const isBooked = bookedSlots.includes(time);

        if (isPast) {
            slot.classList.add('disabled');
        } else if (isBooked) {
            slot.classList.add('disabled');
            slot.title = 'Bu saat dolu - tikla alternatif gor';
            // Dolu saate tiklaninca oneri goster
            slot.addEventListener('click', () => showSuggestions(time, date));
        } else {
            slot.addEventListener('click', () => selectTime(slot, time));
        }

        container.appendChild(slot);
    });

    // Modal event listener'lari ekle
    initModalListeners();
}

// Oneri modalini goster
function showSuggestions(time, date) {
    const modal = document.getElementById('suggestionModal');
    const suggestionList = document.getElementById('suggestionList');
    const suggestionSection = document.getElementById('suggestionSection');
    const noSuggestion = document.getElementById('noSuggestion');

    // Modal bilgilerini guncelle
    document.getElementById('modalBarberName').textContent = selectedBarber.name;
    document.getElementById('modalTime').textContent = time;

    // Ayni saatte musait berberleri bul
    const availableBarbers = barbersData.filter(barber => {
        // Secili berberi atla
        if (barber.id === selectedBarber.id) return false;

        // Bu berberin bu saati dolu mu?
        const barberBooked = allBookedSlots[barber.id] || [];
        return !barberBooked.includes(time);
    });

    if (availableBarbers.length > 0) {
        suggestionSection.style.display = 'block';
        noSuggestion.style.display = 'none';

        suggestionList.innerHTML = availableBarbers.map(barber => {
            const hasPhoto = barber.photos && barber.photos.length > 0;
            const avatarContent = hasPhoto
                ? `<img src="/uploads/${barber.photos[0]}" alt="${barber.name}">`
                : (barber.role === 'patron' ? '&#9986;' : '&#9986;');

            return `
                <div class="suggestion-card" data-barber-id="${barber.id}" data-time="${time}">
                    <div class="suggestion-avatar">
                        ${avatarContent}
                    </div>
                    <div class="suggestion-info">
                        <h4>${barber.name}</h4>
                        <p>${barber.role === 'patron' ? 'Patron' : 'Usta Berber'} - ${time} musait</p>
                    </div>
                    <span class="suggestion-select">&rarr;</span>
                </div>
            `;
        }).join('');

        // Oneri kartlarina tiklama eventi ekle
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', function () {
                const barberId = parseInt(this.dataset.barberId);
                const chosenTime = this.dataset.time;

                // Yeni berberi sec
                const newBarber = barbersData.find(b => b.id === barberId);
                selectedBarber = {
                    id: newBarber.id,
                    name: newBarber.name,
                    role: newBarber.role === 'patron' ? 'Patron' : 'Usta Berber'
                };

                // Berber kartlarini guncelle
                document.querySelectorAll('.barber-card').forEach(c => {
                    c.classList.remove('selected');
                    if (parseInt(c.dataset.barberId) === barberId) {
                        c.classList.add('selected');
                    }
                });

                // Global saati guncelle
                selectedTime = chosenTime;

                // Modali kapat
                closeModal();

                // Bir sonraki adima gec
                showToast(`${newBarber.name} secildi - ${chosenTime}`, 'success');
                setTimeout(() => goToStep(3), 500);
            });
        });
    } else {
        suggestionSection.style.display = 'none';
        noSuggestion.style.display = 'block';
    }

    // Modali goster
    modal.classList.add('active');
}

// Modal event listener'lari
function initModalListeners() {
    const modal = document.getElementById('suggestionModal');
    const closeBtn = document.getElementById('closeModal');
    const selectOtherBtn = document.getElementById('btnSelectOther');

    // Kapatma butonlari
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    if (selectOtherBtn) {
        selectOtherBtn.onclick = closeModal;
    }

    // Dis alana tiklama
    modal.onclick = function (e) {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function closeModal() {
    document.getElementById('suggestionModal').classList.remove('active');
}

function selectTime(slot, time) {
    // Onceki secimi kaldir
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));

    // Yeni secimi ekle
    slot.classList.add('selected');
    selectedTime = time;

    // Sonraki adima gec
    setTimeout(() => goToStep(3), 300);
}

// ========================================
// GORUNUM SECICI
// ========================================
function initViewSelector() {
    const viewBtns = document.querySelectorAll('.view-btn');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const view = this.dataset.view;
            document.querySelector('.weekly-view').classList.toggle('active', view === 'weekly');
            document.querySelector('.monthly-view').classList.toggle('active', view === 'monthly');

            // Saat secimini gizle
            document.getElementById('timeSelection').style.display = 'none';
            selectedDate = null;
            selectedTime = null;
        });
    });
}

// ========================================
// FORM NAVIGASYONU
// ========================================
function initFormNavigation() {
    // Geri butonlari
    document.getElementById('backToStep1').addEventListener('click', () => goToStep(1));
    document.getElementById('backToStep2').addEventListener('click', () => goToStep(2));
    document.getElementById('backToStep3').addEventListener('click', () => goToStep(3));

    // Ileri butonlari
    document.getElementById('goToStep4').addEventListener('click', () => {
        if (validateStep3()) {
            updateSummary();
            goToStep(4);
        }
    });

    // Randevu onayla
    document.getElementById('confirmBooking').addEventListener('click', confirmBooking);

    // Yeni randevu
    document.getElementById('newBooking').addEventListener('click', resetForm);
}

function goToStep(step) {
    currentStep = step; // Global state guncelle

    // Tum adimlari gizle
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));

    // Istenen adimi goster
    document.getElementById(`step${step}`).classList.add('active');

    // Step 1 ise galeriyi gizle
    if (step === 1) {
        hideBarberGallery();
    }

    // Step indicator'u guncelle
    document.querySelectorAll('.step').forEach((s, index) => {
        s.classList.remove('active', 'completed');
        if (index + 1 < step) {
            s.classList.add('completed');
        } else if (index + 1 === step) {
            s.classList.add('active');
        }
    });

    // Sayfayi yukari kaydir
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep3() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();

    if (!name) {
        showToast('Lutfen adinizi ve soyadinizi girin', 'error');
        return false;
    }

    if (!phone || phone.length < 10) {
        showToast('Lutfen gecerli bir telefon numarasi girin', 'error');
        return false;
    }

    return true;
}

function updateSummary() {
    document.getElementById('summaryBarber').textContent =
        `${selectedBarber.name} (${selectedBarber.role})`;
    document.getElementById('summaryDate').textContent =
        `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()} ${dayNamesFull[selectedDate.getDay()]}`;
    document.getElementById('summaryTime').textContent = selectedTime;
    document.getElementById('summaryName').textContent =
        document.getElementById('customerName').value.trim();
    document.getElementById('summaryPhone').textContent =
        document.getElementById('customerPhone').value.trim();

    const note = document.getElementById('customerNote').value.trim();
    if (note) {
        document.getElementById('summaryNoteContainer').style.display = 'flex';
        document.getElementById('summaryNote').textContent = note;
    } else {
        document.getElementById('summaryNoteContainer').style.display = 'none';
    }
}

// ========================================
// RANDEVU ONAYLA
// ========================================
async function confirmBooking() {
    const appointment = {
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        date: formatDate(selectedDate),
        time: selectedTime,
        customerName: document.getElementById('customerName').value.trim(),
        customerPhone: document.getElementById('customerPhone').value.trim(),
        note: document.getElementById('customerNote').value.trim(),
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointment)
        });

        if (response.ok) {
            showSuccess();
        } else {
            throw new Error('Randevu olusturulamadi');
        }
    } catch (error) {
        console.error('API hatasi:', error);
        // Demo modda basarili goster
        showSuccess();
    }
}

function showSuccess() {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById('successStep').classList.add('active');

    // Step indicator'u guncelle
    document.querySelectorAll('.step').forEach(s => s.classList.add('completed'));
}

function resetForm() {
    // Secilenleri sifirla
    selectedBarber = null;
    selectedDate = null;
    selectedTime = null;

    // Formu temizle
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerNote').value = '';

    // Berber secimini kaldir
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));

    // Galeriyi gizle
    hideBarberGallery();

    // Takvimi sifirla
    setWeekStart();
    renderWeeklyCalendar();
    renderMonthlyCalendar();
    document.getElementById('timeSelection').style.display = 'none';

    // Ilk adima git
    goToStep(1);
}

// ========================================
// YARDIMCI FONKSIYONLAR
// ========================================
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showToast(message, type = 'success') {
    // Eski toast varsa kaldir
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
