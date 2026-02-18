const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;

// Uploads klasorunu olustur
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer yapilandirmasi
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'barber-' + req.params.id + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece JPG, PNG ve WEBP dosyalari yuklenebilir'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Veritabani dosyasi
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Data klasorunu olustur
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Veritabanini yukle veya olustur
function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Veritabani olusturuluyor...');
    }

    // Varsayilan veritabani
    const defaultDB = {
        barbers: [
            { id: 1, name: 'Muhammed', role: 'patron', username: 'muhammed', password: '1234', experience: '15 Yil' },
            { id: 2, name: 'Cengo', role: 'berber', username: 'cengo', password: '1234', experience: '8 Yil' },
            { id: 3, name: 'Rio', role: 'berber', username: 'rio', password: '1234', experience: '5 Yil' },
            { id: 4, name: 'Ahmet', role: 'berber', username: 'ahmet', password: '1234', experience: '3 Yil' }
        ],
        appointments: [],
        settings: {
            shopName: '045 Berber Shop',
            workingHours: { start: '09:00', end: '21:00' },
            closedDay: 0 // Pazar
        }
    };

    saveDatabase(defaultDB);
    return defaultDB;
}

// Veritabanini kaydet
function saveDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ========================================
// API ROUTES
// ========================================

// Berberleri getir
app.get('/api/barbers', (req, res) => {
    const db = loadDatabase();
    const barbers = db.barbers.map(b => ({
        id: b.id,
        name: b.name,
        role: b.role,
        experience: b.experience,
        photos: b.photos || []
    }));
    res.json(barbers);
});

// Randevulari getir (tarih ve berber filtresi)
app.get('/api/appointments', (req, res) => {
    const db = loadDatabase();
    let appointments = db.appointments;

    const { barberId, date, startDate, endDate } = req.query;

    if (barberId) {
        appointments = appointments.filter(a => a.barberId === parseInt(barberId));
    }

    if (date) {
        appointments = appointments.filter(a => a.date === date);
    }

    if (startDate && endDate) {
        appointments = appointments.filter(a => a.date >= startDate && a.date <= endDate);
    }

    res.json(appointments);
});

// Yeni randevu olustur
app.post('/api/appointments', (req, res) => {
    const db = loadDatabase();
    const { barberId, barberName, date, time, customerName, customerPhone, note } = req.body;

    // Ayni saat dolu mu kontrol et
    const existing = db.appointments.find(
        a => a.barberId === barberId && a.date === date && a.time === time
    );

    if (existing) {
        return res.status(400).json({ error: 'Bu saat dolu' });
    }

    const newAppointment = {
        id: Date.now(),
        barberId,
        barberName,
        date,
        time,
        customerName,
        customerPhone,
        note: note || '',
        status: 'bekliyor', // bekliyor, onaylandi, iptal
        createdAt: new Date().toISOString()
    };

    db.appointments.push(newAppointment);
    saveDatabase(db);

    console.log(`Yeni randevu: ${customerName} - ${barberName} - ${date} ${time}`);

    res.status(201).json(newAppointment);
});

// Randevu durumunu guncelle
app.put('/api/appointments/:id', (req, res) => {
    const db = loadDatabase();
    const id = parseInt(req.params.id);
    const { status, note, cancelNote } = req.body;

    const index = db.appointments.findIndex(a => a.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Randevu bulunamadi' });
    }

    if (status) db.appointments[index].status = status;
    if (note !== undefined) db.appointments[index].note = note;
    if (cancelNote !== undefined) db.appointments[index].cancelNote = cancelNote;

    saveDatabase(db);
    res.json(db.appointments[index]);
});

// Randevu sil
app.delete('/api/appointments/:id', (req, res) => {
    const db = loadDatabase();
    const id = parseInt(req.params.id);

    const index = db.appointments.findIndex(a => a.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Randevu bulunamadi' });
    }

    db.appointments.splice(index, 1);
    saveDatabase(db);

    res.json({ message: 'Randevu silindi' });
});

// ========================================
// BERBER GIRIS
// ========================================
app.post('/api/login', (req, res) => {
    const db = loadDatabase();
    const { username, password } = req.body;

    const barber = db.barbers.find(
        b => b.username === username && b.password === password
    );

    if (!barber) {
        return res.status(401).json({ error: 'Gecersiz kullanici adi veya sifre' });
    }

    res.json({
        id: barber.id,
        name: barber.name,
        role: barber.role,
        username: barber.username
    });
});

// Berber kendi randevularini getir
app.get('/api/barber/:id/appointments', (req, res) => {
    const db = loadDatabase();
    const barberId = parseInt(req.params.id);
    const { date, startDate, endDate } = req.query;

    let appointments = db.appointments.filter(a => a.barberId === barberId);

    if (date) {
        appointments = appointments.filter(a => a.date === date);
    }

    if (startDate && endDate) {
        appointments = appointments.filter(a => a.date >= startDate && a.date <= endDate);
    }

    // Tarihe ve saate gore sirala
    appointments.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    res.json(appointments);
});

// ========================================
// ADMIN (PATRON) ROUTES
// ========================================

// Tum randevulari getir (patron icin)
app.get('/api/admin/appointments', (req, res) => {
    const db = loadDatabase();
    const { date, startDate, endDate, barberId } = req.query;

    let appointments = [...db.appointments];

    if (date) {
        appointments = appointments.filter(a => a.date === date);
    }

    if (startDate && endDate) {
        appointments = appointments.filter(a => a.date >= startDate && a.date <= endDate);
    }

    if (barberId) {
        appointments = appointments.filter(a => a.barberId === parseInt(barberId));
    }

    // Tarihe ve saate gore sirala
    appointments.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    res.json(appointments);
});

// Istatistikler (patron icin)
app.get('/api/admin/stats', (req, res) => {
    const db = loadDatabase();
    const today = new Date().toISOString().split('T')[0];

    const todayAppointments = db.appointments.filter(a => a.date === today);
    const pendingAppointments = db.appointments.filter(a => a.status === 'bekliyor');
    const totalAppointments = db.appointments.length;

    // Berber bazinda randevu sayilari
    const barberStats = db.barbers.map(b => ({
        id: b.id,
        name: b.name,
        todayCount: todayAppointments.filter(a => a.barberId === b.id).length,
        totalCount: db.appointments.filter(a => a.barberId === b.id).length
    }));

    res.json({
        today: todayAppointments.length,
        pending: pendingAppointments.length,
        total: totalAppointments,
        barberStats
    });
});

// ========================================
// FOTOGRAF API'LERI
// ========================================

// Fotograf yukle
app.post('/api/barber/:id/photos', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Dosya yuklenemedi' });
    }

    const db = loadDatabase();
    const barberId = parseInt(req.params.id);
    const barber = db.barbers.find(b => b.id === barberId);

    if (!barber) {
        // Dosyayi sil
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Berber bulunamadi' });
    }

    if (!barber.photos) {
        barber.photos = [];
    }

    barber.photos.push(req.file.filename);
    saveDatabase(db);

    res.status(201).json({ filename: req.file.filename, photos: barber.photos });
});

// Fotograf sil
app.delete('/api/barber/:id/photos/:filename', (req, res) => {
    const db = loadDatabase();
    const barberId = parseInt(req.params.id);
    const barber = db.barbers.find(b => b.id === barberId);

    if (!barber) {
        return res.status(404).json({ error: 'Berber bulunamadi' });
    }

    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Dosyayi sil
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // Veritabanindan kaldir
    if (barber.photos) {
        barber.photos = barber.photos.filter(p => p !== filename);
    }
    saveDatabase(db);

    res.json({ message: 'Fotograf silindi', photos: barber.photos || [] });
});

// Berber fotograflarini listele
app.get('/api/barber/:id/photos', (req, res) => {
    const db = loadDatabase();
    const barberId = parseInt(req.params.id);
    const barber = db.barbers.find(b => b.id === barberId);

    if (!barber) {
        return res.status(404).json({ error: 'Berber bulunamadi' });
    }

    res.json(barber.photos || []);
});

// ========================================
// ANA SAYFA YONLENDIRMESI
// ========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/berber', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'berber-panel.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));
});

// ========================================
// SUNUCUYU BASLAT
// ========================================
app.listen(PORT, () => {
    console.log('========================================');
    console.log('   045 BERBER SHOP - RANDEVU SISTEMI');
    console.log('========================================');
    console.log(`Sunucu calisiyor: http://localhost:${PORT}`);
    console.log('');
    console.log('Sayfalar:');
    console.log(`  Musteri:  http://localhost:${PORT}`);
    console.log(`  Berber:   http://localhost:${PORT}/berber`);
    console.log(`  Admin:    http://localhost:${PORT}/admin`);
    console.log('');
    console.log('Giris Bilgileri:');
    console.log('  Muhammed: muhammed / 1234');
    console.log('  Cengo:    cengo / 1234');
    console.log('  Rio:      rio / 1234');
    console.log('  Ahmet:    ahmet / 1234');
    console.log('========================================');
});
