const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

// Supabase Yapilandirmasi
const SUPABASE_URL = 'https://pbwwiihlkqsjebgzlddq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBid3dpaWhsa3FzamViZ3psZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTE5NTQsImV4cCI6MjA4NzA2Nzk1NH0.Rs2XXH9Kv0L3WMGu0IP4sxvxZLrket-S1setOLxzmUY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Uploads klasorunu olustur
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer yapilandirmasi (memory - Supabase Storage kullaniyoruz)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece JPG, PNG ve WEBP dosyalari yuklenebilir'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const STORAGE_BUCKET = 'barber-photos';

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

// Data klasorunu olustur (Uploads icin hala gerekebilir)
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// ========================================
// API ROUTES
// ========================================

// Berberleri getir
app.get('/api/barbers', async (req, res) => {
    const { data: barbers, error } = await supabase
        .from('barbers')
        .select('id, name, role, experience, photos');

    if (error) return res.status(500).json({ error: error.message });
    res.json(barbers);
});

// Randevulari getir (tarih ve berber filtresi)
app.get('/api/appointments', async (req, res) => {
    let query = supabase.from('appointments').select('*');

    const { barberId, date, startDate, endDate } = req.query;

    if (barberId) query = query.eq('barber_id', parseInt(barberId));
    if (date) query = query.eq('date', date);
    if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: appointments, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(appointments);
});

// Yeni randevu olustur
app.post('/api/appointments', async (req, res) => {
    const { barberId, barberName, date, time, customerName, customerPhone, note } = req.body;

    console.log('[RANDEVU] Yeni randevu istegi:', { barberId, barberName, date, time, customerName, customerPhone });

    if (!barberId || !date || !time || !customerName || !customerPhone) {
        console.error('[RANDEVU] Eksik alan:', { barberId, date, time, customerName, customerPhone });
        return res.status(400).json({ error: 'Eksik alanlar: barberId, date, time, customerName, customerPhone zorunludur.' });
    }

    const { data, error } = await supabase
        .from('appointments')
        .insert([{
            barber_id: parseInt(barberId),
            barber_name: barberName,
            date,
            time,
            customer_name: customerName,
            customer_phone: customerPhone,
            note,
            status: 'bekliyor'
        }])
        .select();

    if (error) {
        console.error('[RANDEVU] Supabase hatasi:', error);
        return res.status(500).json({ error: error.message });
    }

    console.log('[RANDEVU] Basarili:', data[0]?.id);
    res.json(data[0]);
});


// ========================================
// MARKET PRODUCTS API
// ========================================

// Tum urunleri getir
app.get('/api/products', async (req, res) => {
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(products);
});

// Yeni urun ekle (Admin)
app.post('/api/products', upload.single('image'), async (req, res) => {
    const { name, price, description, category } = req.body;
    const imageUrl = req.file ? req.file.filename : null;

    const { data, error } = await supabase
        .from('products')
        .insert([{
            name,
            price,
            description,
            category,
            image_url: imageUrl
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Urun sil (Admin)
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Urun silindi' });
});

// Randevu durumunu guncelle
app.put('/api/appointments/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, note, cancelNote } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (note !== undefined) updateData.note = note;
    if (cancelNote !== undefined) updateData.cancelNote = cancelNote;

    const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Randevu sil
app.delete('/api/appointments/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Randevu silindi' });
});

// ========================================
// BERBER GIRIS
// ========================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const { data: barber, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (error || !barber) {
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
app.get('/api/barber/:id/appointments', async (req, res) => {
    const barberId = parseInt(req.params.id);
    const { date, startDate, endDate } = req.query;

    let query = supabase.from('appointments').select('*').eq('barber_id', barberId);

    if (date) query = query.eq('date', date);
    if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
    }

    // Sirala
    query = query.order('date', { ascending: true }).order('time', { ascending: true });

    const { data: appointments, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(appointments);
});


// ========================================
// ADMIN (PATRON) ROUTES
// ========================================

// Tum randevulari getir (patron icin)
app.get('/api/admin/appointments', async (req, res) => {
    const { date, startDate, endDate, barberId, status } = req.query;

    let query = supabase.from('appointments').select('*');

    if (date) query = query.eq('date', date);
    if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
    }
    if (barberId) query = query.eq('barber_id', parseInt(barberId));
    if (status) query = query.eq('status', status);

    // Sirala (Tarihe gore)
    query = query.order('date', { ascending: true }).order('time', { ascending: true });

    const { data: appointments, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(appointments);
});

// Istatistikler (patron icin)
app.get('/api/admin/stats', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: allAppointments, error: aptError } = await supabase.from('appointments').select('id, date, status, barber_id');
    const { data: barbers, error: barbError } = await supabase.from('barbers').select('id, name');

    if (aptError || barbError) return res.status(500).json({ error: (aptError || barbError).message });

    const todayAppointments = allAppointments.filter(a => a.date === today);
    const pendingAppointments = allAppointments.filter(a => a.status === 'bekliyor');
    const approvedAppointments = allAppointments.filter(a => a.status === 'onaylandi');
    const cancelledAppointments = allAppointments.filter(a => a.status === 'iptal');

    const barberStats = barbers.map(b => ({
        id: b.id,
        name: b.name,
        todayCount: todayAppointments.filter(a => a.barber_id === b.id).length,
        pendingCount: pendingAppointments.filter(a => a.barber_id === b.id).length,
        approvedCount: approvedAppointments.filter(a => a.barber_id === b.id).length,
        cancelledCount: cancelledAppointments.filter(a => a.barber_id === b.id).length,
        totalCount: allAppointments.filter(a => a.barber_id === b.id).length
    }));

    res.json({
        today: todayAppointments.length,
        pending: pendingAppointments.length,
        approved: approvedAppointments.length,
        cancelled: cancelledAppointments.length,
        total: allAppointments.length,
        barberStats
    });
});

// ========================================
// FOTOGRAF API'LERI
// ========================================

// Fotograf yukle (Supabase Storage)
app.post('/api/barber/:id/photos', upload.single('photo'), async (req, res) => {
    console.log('[FOTOGRAF] Upload istegi geldi, barberId:', req.params.id, 'file:', req.file ? req.file.originalname : 'YOK');
    if (!req.file) {
        console.error('[FOTOGRAF] Dosya yok!');
        return res.status(400).json({ error: 'Dosya yuklenemedi' });
    }

    const barberId = parseInt(req.params.id);
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `barber-${barberId}-${Date.now()}${ext}`;

    // Supabase Storage'a yukle
    const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });

    if (storageError) {
        console.error('[FOTOGRAF] Storage hatasi:', storageError.message);
        return res.status(500).json({ error: 'Fotograf yuklenemedi: ' + storageError.message });
    }

    // Berberi getir ve photos guncelle
    const { data: barber, error: fetchError } = await supabase
        .from('barbers')
        .select('photos')
        .eq('id', barberId)
        .single();

    if (fetchError || !barber) {
        return res.status(404).json({ error: 'Berber bulunamadi' });
    }

    const photos = barber.photos || [];
    photos.push(filename);

    const { error: updateError } = await supabase
        .from('barbers')
        .update({ photos })
        .eq('id', barberId);

    if (updateError) return res.status(500).json({ error: updateError.message });

    console.log('[FOTOGRAF] Yuklendi Supabase Storage:', filename);
    res.status(201).json({ filename, photos });
});

// Fotograf sil
app.delete('/api/barber/:id/photos/:filename', async (req, res) => {
    const barberId = parseInt(req.params.id);
    const filename = req.params.filename;

    const { data: barber, error: fetchError } = await supabase
        .from('barbers')
        .select('photos')
        .eq('id', barberId)
        .single();

    if (fetchError || !barber) {
        return res.status(404).json({ error: 'Berber bulunamadi' });
    }

    // Supabase Storage'dan sil (sabit profil fotograflari haric)
    const localPhotos = ['muhammed.jpeg', 'cengo.jpg', 'rio.jpg', 'ahmet.jpg'];
    if (!localPhotos.includes(filename)) {
        await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
    }
    // Eski yerel dosya varsa da sil
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    const photos = (barber.photos || []).filter(p => p !== filename);

    const { error: updateError } = await supabase
        .from('barbers')
        .update({ photos })
        .eq('id', barberId);

    if (updateError) return res.status(500).json({ error: updateError.message });

    res.json({ message: 'Fotograf silindi', photos });
});

// Berber fotograflarini listele
app.get('/api/barber/:id/photos', async (req, res) => {
    const barberId = parseInt(req.params.id);

    const { data, error } = await supabase
        .from('barbers')
        .select('photos')
        .eq('id', barberId)
        .single();

    if (error || !data) {
        return res.status(404).json({ error: 'Berber bulunamadi' });
    }

    res.json(data.photos || []);
});

// ========================================
// ANA SAYFA YONLENDIRMESI
// ========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
    console.log(`  Admin:    http://localhost:${PORT}/admin`);
    console.log('');
    console.log('Giris Bilgileri:');
    console.log('  Muhammed: muhammed / 1234');
    console.log('  Cengo:    cengo / 1234');
    console.log('  Rio:      rio / 1234');
    console.log('  Ahmet:    ahmet / 1234');
    console.log('========================================');
});
