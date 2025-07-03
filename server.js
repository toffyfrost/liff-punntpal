// นำเข้า library ที่จำเป็น
// 'express' คือ library หลักสำหรับสร้างเว็บเซิร์ฟเวอร์
// 'path' คือ library สำหรับจัดการกับเส้นทางของไฟล์ (file path)
const express = require("express");
const path =require("path");

// สร้าง instance ของ express app
const app = express();

// --- การตั้งค่าที่สำคัญ ---

// 1. กำหนดให้ Express มองหาและให้บริการไฟล์สาธารณะ (เช่น CSS, JS, รูปภาพ)
//    จากในโฟลเดอร์ชื่อ 'public'
//    path.join(__dirname, 'public') คือการสร้าง path ที่ถูกต้องไปยังโฟลเดอร์ 'public'
//    ไม่ว่าโปรเจกต์นี้จะถูกรันอยู่ที่ไหนก็ตาม
app.use(express.static(path.join(__dirname, 'public')));


// 2. สร้าง Route หรือเส้นทางหลักของเว็บ
//    เมื่อมีคนเข้ามาที่หน้าแรกของเว็บ (เช่น your-app.vercel.app/)
//    ให้ส่งไฟล์ index.html ที่อยู่ในโฟลเดอร์ public กลับไปให้เบราว์เซอร์
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// 3. (ทางเลือก แต่แนะนำ) สร้าง Route ที่ดักจับทุกเส้นทางที่ไม่มีอยู่จริง
//    ถ้าผู้ใช้พิมพ์ URL มั่วๆ (เช่น your-app.vercel.app/some-random-page)
//    เราจะส่งหน้าแรก (index.html) กลับไปให้ เพื่อให้แอปของเรา (ที่เป็น Single-Page App)
//    จัดการเรื่องการแสดงผลต่อเอง
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- ส่วนที่สำคัญที่สุดสำหรับ Vercel ---

// 4. Export ตัวแปร 'app' (Express app ของเรา) ออกไป
//    เพื่อให้ Vercel รู้ว่านี่คือเซิร์ฟเวอร์หลักที่ต้องนำไปรันในสภาพแวดล้อมแบบ Serverless
module.exports = app;

// หมายเหตุ: เราได้ลบส่วน app.listen(...) ออกไปแล้ว
// เพราะ Vercel จะจัดการเรื่องการรันเซิร์ฟเวอร์และ Port ให้เองโดยอัตโนมัติ
// การมี app.listen(...) อาจทำให้เกิดข้อขัดแย้งกับระบบของ Vercel ได้