// ========================================
// GLOBAL DEGISKENLER
// ========================================
const API_URL = 'http://localhost:4000/api';

let selectedBarber = null;
let selectedDate = null;
let selectedTime = null;
let currentWeekStart = new Date();
let currentMonth = new Date();

// Berber bilgileri
const barbers = [
    { id: 1, name: 'Muhammed', role: 'Patron' },
    { id: 2, name: 'Cengo', role: 'Usta Berber' },
    { id: 3, name: 'Rio', role: 'Usta Berber' },
    { id: 4, name: 'Ahmet', role: 'Usta Berber' }
];

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

// ========================================
// SAYFA YUKLENDIKTEN SONRA
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initBarberSelection();
    initCalendar();
    initFormNavigation();
    initViewSelector();

    // Haftanin baslangicini pazartesi yap
    setWeekStart();
    renderWeeklyCalendar();
    renderMonthlyCalendar();
});

// ========================================
// BERBER SECIMI
// ========================================
function initBarberSelection() {
    const barberCards = document.querySelectorAll('.barber-card');

    barberCards.forEach(card => {
        card.addEventListener('click', function() {
            // Onceki secimi kaldir
            barberCards.forEach(c => c.classList.remove('selected'));

            // Yeni secimi ekle
            this.classList.add('selected');
            selectedBarber = {
                id: parseInt(this.dataset.barberId),
                name: this.querySelector('h3').textContent,
                role: this.querySelector('.barber-role').textContent
            };

            // Otomatik olarak sonraki adima gec
            setTimeout(() => goToStep(2), 300);
        });
    });
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
    const availableBarbers = barbers.filter(barber => {
        // Secili berberi atla
        if (barber.id === selectedBarber.id) return false;

        // Bu berberin bu saati dolu mu?
        const barberBooked = allBookedSlots[barber.id] || [];
        return !barberBooked.includes(time);
    });

    if (availableBarbers.length > 0) {
        suggestionSection.style.display = 'block';
        noSuggestion.style.display = 'none';

        suggestionList.innerHTML = availableBarbers.map(barber => `
            <div class="suggestion-card" data-barber-id="${barber.id}" data-time="${time}">
                <div class="suggestion-avatar">
                    ${barber.id === 1 ? '👨‍💼' : '👨'}
                </div>
                <div class="suggestion-info">
                    <h4>${barber.name}</h4>
                    <p>${barber.role} - ${time} musait</p>
                </div>
                <span class="suggestion-select">→</span>
            </div>
        `).join('');

        // Oneri kartlarina tiklama eventi ekle
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', function() {
                const barberId = parseInt(this.dataset.barberId);
                const chosenTime = this.dataset.time;

                // Yeni berberi sec
                const newBarber = barbers.find(b => b.id === barberId);
                selectedBarber = {
                    id: newBarber.id,
                    name: newBarber.name,
                    role: newBarber.role
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
    modal.onclick = function(e) {
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
        btn.addEventListener('click', function() {
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
    // Tum adimlari gizle
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));

    // Istenen adimi goster
    document.getElementById(`step${step}`).classList.add('active');

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
