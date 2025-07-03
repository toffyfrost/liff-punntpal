const express = require("express");
const path = require("path");
const app = express();

// กำหนดให้ Express มองหาไฟล์ static (เช่น CSS, JS, รูปภาพ) จากในโฟลเดอร์ 'public'
// __dirname คือ path เต็มของโปรเจกต์ ณ ตำแหน่งที่ไฟล์นี้ถูกรัน
app.use(express.static(path.join(__dirname, 'public')));

// สร้าง Route หลัก (เมื่อมีคนเข้าเว็บ "/")
// ให้ส่งไฟล์ index.html ที่อยู่ในโฟลเดอร์ public กลับไป
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ส่วนนี้สำคัญมากสำหรับ Vercel:
// สร้าง Route สำหรับดักจับทุก Request ที่เข้ามา
// เพื่อให้แน่ใจว่า Vercel จะรันไฟล์นี้เป็นเซิร์ฟเวอร์หลัก
app.get('*', (req, res) => {
    // คุณสามารถส่ง 404 ที่นี่ หรือ redirect กลับไปหน้าแรกก็ได้
    // แต่เพื่อความง่าย เราจะส่ง index.html กลับไปก่อน
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ทำให้ Vercel สามารถ export แอปนี้ไปใช้งานได้
module.exports = app;

// ส่วนนี้จะถูกใช้เมื่อรันบนเครื่องตัวเอง แต่ Vercel จะไม่ใช้ส่วนนี้
// แต่เก็บไว้ก็ไม่เสียหายครับ
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}