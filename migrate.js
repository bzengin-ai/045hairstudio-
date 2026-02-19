const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://pbwwiihlkqsjebgzlddq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBid3dpaWhsa3FzamViZ3psZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTE5NTQsImV4cCI6MjA4NzA2Nzk1NH0.Rs2XXH9Kv0L3WMGu0IP4sxvxZLrket-S1setOLxzmUY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB_PATH = path.join(__dirname, 'data', 'database.json');

async function migrate() {
    console.log('Migrasyon basliyor...');

    if (!fs.existsSync(DB_PATH)) {
        console.error('database.json bulunamadi!');
        return;
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // 1. Berberleri Yukle
    console.log('Berberler yukleniyor...');
    for (const barber of db.barbers) {
        const { error } = await supabase
            .from('barbers')
            .upsert({
                id: barber.id,
                name: barber.name,
                role: barber.role,
                username: barber.username,
                password: barber.password,
                experience: barber.experience,
                photos: barber.photos || []
            });
        if (error) console.error(`Berber yukleme hatasi (${barber.name}):`, error.message);
    }

    // 2. Randevulari Yukle
    console.log('Randevular yukleniyor...');
    for (const apt of db.appointments) {
        const { error } = await supabase
            .from('appointments')
            .upsert({
                id: apt.id,
                barber_id: apt.barberId,
                barber_name: apt.barberName,
                date: apt.date,
                time: apt.time,
                customer_name: apt.customerName,
                customer_phone: apt.customerPhone,
                note: apt.note,
                status: apt.status,
                created_at: apt.createdAt
            });
        if (error) console.error(`Randevu yukleme hatasi (${apt.customerName}):`, error.message);
    }

    console.log('Migrasyon tamamlandi!');
}

migrate();
