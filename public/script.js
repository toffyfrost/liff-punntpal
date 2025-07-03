// ===================================
//      ส่วนตั้งค่าและตัวแปรส่วนกลาง
// ===================================

// !!! --- กรุณากรอกข้อมูล 3 ส่วนนี้ --- !!!
const LIFF_ID = "2007668164-KQRMyj2B";
const GAS_URL = "https://script.google.com/macros/s/AKfycbwP50fjZK-bK1BsTE9ZtfCfAHFzxI-J-jITDLD8yqYg5tMQYteB4cl-Xw34OtLrDKe57w/exec";
const SECRET_KEY = "Teer@sakSep1991";
// !!! ------------------------------------ !!!

// ตัวแปรส่วนกลางสำหรับเก็บข้อมูลของแอป
const App = { user: null, categories: [], accounts: [], detailedAccounts: [], currentPage: 'Dashboard' };
// ตัวแปรสำหรับจัดการ Modal ของ Bootstrap
let categoriesModalInstance = null, accountsModalInstance = null, installmentModalInstance = null;

// ===================================
//      การเริ่มต้นแอปและระบบ Login (LIFF)
// ===================================
$(document).ready(async function() {
    try {
        $('#loading-text').text('กำลังเชื่อมต่อกับ LINE...');
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
            $('#loading-text').text('กรุณาเข้าสู่ระบบ...');
            liff.login();
            return;
        }

        $('#loading-text').text('กำลังโหลดข้อมูลผู้ใช้...');
        const profile = await liff.getProfile();
        App.user = {
            id: profile.userId,
            name: profile.displayName,
            pictureUrl: profile.pictureUrl,
            profile: profile
        };
        
        await initializeApp();
    } catch (err) {
        console.error("LIFF Init Error:", err);
        $('#loading-overlay').html(`<div class="loader-container"><p class="text-danger">เกิดข้อผิดพลาดในการเริ่มต้น LIFF</p><p class="small text-muted">${err.message}</p></div>`);
    }
});

async function initializeApp() {
    $('#loading-text').text('กำลังโหลดข้อมูลบัญชี...');
    const userData = await callBackend('getUserData');
    
    if (userData.success) {
        App.categories = userData.categories;
        App.accounts = userData.accounts;
        showAppUI();
        setupCentralListeners();
        loadPage('Dashboard');
    } else {
        showError(userData);
    }
}

function showAppUI() {
    $('#user-display-name').text(App.user.name);
    $('#user-picture').attr('src', App.user.pictureUrl);
    $('#app-main-container').show();
    $('#loading-overlay').fadeOut();
}

function handleLogout() {
    Swal.fire({
        title: 'ต้องการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ออกจากระบบ!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed && liff.isLoggedIn()) {
            liff.logout();
            window.location.reload();
        }
    });
}

// ===================================
//      ฟังก์ชันสำหรับเรียกใช้ Backend
// ===================================
async function callBackend(functionName, data = {}) {
    $('#loading-overlay').stop(true, true).fadeIn(100);
    $('#loading-text').text('กำลังประมวลผล...');
    try {
        const payload = {
            secretKey: SECRET_KEY,
            functionName: functionName,
            userId: App.user.id,
            profile: App.user.profile,
            data: data
        };

        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: "follow"
        });
        
        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        // หน่วงเวลาเล็กน้อยเพื่อให้ User เห็นว่ากำลังโหลดเสร็จ
        setTimeout(() => {
            $('#loading-overlay').stop(true, true).fadeOut();
        }, 200);
        return result;

    } catch (error) {
        console.error(`Error calling backend function ${functionName}:`, error);
        $('#loading-overlay').stop(true, true).fadeOut();
        return { success: false, message: `ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${error.message}` };
    }
}


// ===================================
//      การโหลดหน้าต่างๆ (Routing)
// ===================================
async function loadPage(pageName) {
    if (!pageName) return;

    $('.app-nav .nav-item, .app-nav .nav-item-add').removeClass('active');
    $(`.app-nav [data-page="${pageName}"]`).addClass('active');
    App.currentPage = pageName;
    $('#header-title').text(getPageTitle(pageName));
    $('#app-content').html('<div class="text-center mt-5"><div class="spinner-border text-success" role="status"></div></div>');
    
    try {
        const response = await fetch(`/pages/${pageName}.html`);
        if (!response.ok) throw new Error("Page not found");
        const html = await response.text();
        $('#app-content').html(html);
        executePageLogic(pageName);
    } catch (error) {
        console.error("Page Load Error:", error);
        showError({ message: `ไม่สามารถโหลดหน้า ${pageName} ได้` });
    }
}

function getPageTitle(pageName) {
    const titles = {
        'Dashboard': 'ภาพรวม',
        'History': 'รายการทั้งหมด',
        'AddTransaction': 'เพิ่มรายการ',
        'Cards': 'บัญชีและบัตร',
        'Installment': 'รายการผ่อนชำระ',
        'Settings': 'ตั้งค่า'
    };
    return titles[pageName] || 'Money Tracker';
}

// ===================================
//      ตัวกระจายงานสำหรับแต่ละหน้า (สมบูรณ์แล้ว)
// ===================================
function executePageLogic(pageName) {
    switch (pageName) {
        case 'Dashboard': 
            setupDashboardPage(); 
            break;
        case 'History': 
            setupHistoryPage(); 
            break;
        case 'AddTransaction': 
            setupTransactionForm(); 
            break;
        case 'Cards': 
            setupCardsPage(); 
            break;
        case 'Installment': 
            setupInstallmentPage(); 
            break; 
        case 'Settings': 
            setupSettingsPage(); 
            break;
    }
}

// ===================================
//      Event Listeners ส่วนกลาง
// ===================================
function setupCentralListeners() {
    // Navigation Bar
    $('.app-nav').on('click', '.nav-item, .app-nav .nav-item-add', function(e) {
        e.preventDefault();
        loadPage($(this).data('page'));
    });

    // Logout Button
    $(document).on('click', '#logout-btn', handleLogout);

    // Settings Page Buttons to Open Modals
    $(document).on('click', '#open-categories-modal-btn', function() {
        if (!categoriesModalInstance) {
             categoriesModalInstance = new bootstrap.Modal(document.getElementById('categoriesModal'));
        }
        categoriesModalInstance.show();
        renderCategoryList();
    });
    
    $(document).on('click', '#open-accounts-modal-btn', function() {
        if (!accountsModalInstance) {
            accountsModalInstance = new bootstrap.Modal(document.getElementById('accountsModal'));
        }
        accountsModalInstance.show();
        renderAccountListInModal();
    });
}

// ===================================
//      Logic เฉพาะของแต่ละหน้า (ครบทุกฟังก์ชัน)
// ===================================

// --- หน้า Dashboard ---
async function setupDashboardPage() {
    const data = await callBackend('getDashboardData');
    if (data.success) {
        updateDashboardUI(data);
    } else {
        $('#app-content').html('<div class="alert alert-danger">ไม่สามารถโหลดข้อมูล Dashboard ได้</div>');
        showError(data);
    }
}

function updateDashboardUI(data) {
   $('#summary-income').text('฿' + parseFloat(data.summary.income).toLocaleString('th-TH', { minimumFractionDigits: 2 }));
   $('#summary-expense').text('฿' + parseFloat(data.summary.expense).toLocaleString('th-TH', { minimumFractionDigits: 2 }));
   $('#summary-balance').text('฿' + parseFloat(data.summary.net).toLocaleString('th-TH', { minimumFractionDigits: 2 }));
   
   const expenseList = $('#expense-breakdown-list').empty();
   if (data.expenseBreakdown && data.expenseBreakdown.length > 0) {
       const totalExpense = data.expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
       
       data.expenseBreakdown.forEach(item => {
           const percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;
           const icon = getCategoryIcon(item.category);
           const html = `
               <div class="stats-item">
                   <div class="stats-icon">${icon}</div>
                   <div class="stats-bar-content">
                       <div class="stats-label">${item.category}</div>
                       <div class="stats-bar-container">
                           <div class="stats-bar" style="width: ${percentage}%;"></div>
                       </div>
                   </div>
                   <div class="stats-amount">${parseFloat(item.amount).toLocaleString('th-TH')}</div>
               </div>
           `;
           expenseList.append(html);
       });
   } else {
       expenseList.html('<p class="text-center text-muted small p-4">ไม่มีข้อมูลรายจ่าย</p>');
   }
}

function getCategoryIcon(categoryName) {
    const map = {
        'อาหารและเครื่องดื่ม': '<i class="bi bi-egg-fried"></i>',
        'การเดินทาง': '<i class="bi bi-train-front"></i>',
        'ช้อปปิ้ง': '<i class="bi bi-bag"></i>',
        'ความบันเทิง': '<i class="bi bi-film"></i>',
        'ที่อยู่อาศัย': '<i class="bi bi-house"></i>',
        'บิลและค่าใช้จ่าย': '<i class="bi bi-receipt"></i>',
        'เงินเดือน': '<i class="bi bi-wallet2"></i>',
        'รายได้เสริม': '<i class="bi bi-cash-stack"></i>',
        'โอนเงินออก': '<i class="bi bi-arrow-up-right-circle"></i>',
        'โอนเงินเข้า': '<i class="bi bi-arrow-down-left-circle"></i>',
    };
    return map[categoryName] || '<i class="bi bi-tag"></i>';
}

// --- หน้า History ---
async function setupHistoryPage() {
    const data = await callBackend('getTransactions', {});
     if (data.success) {
        renderHistoryPage(data);
    } else {
        $('#app-content').html('<div class="alert alert-danger">ไม่สามารถโหลดประวัติได้</div>');
        showError(data);
    }
}

function renderHistoryPage(response) {
    const resultsDiv = $('#history-list').empty();
    if (!response.transactions || response.transactions.length === 0) { 
        resultsDiv.html('<div class="text-center p-4 text-muted">ไม่พบรายการ</div>'); 
        return; 
    }

    let currentDate = null;
    response.transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        if (isNaN(txDate.getTime())) { return; }
        
        const formattedDate = txDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        if (currentDate !== formattedDate) {
            resultsDiv.append(`<div class="history-date-header">${formattedDate}</div>`);
            currentDate = formattedDate;
        }

        const isIncome = tx.type === 'รายรับ';
        const icon = getCategoryIcon(tx.category);
        const amountClass = isIncome ? 'income' : 'expense';
        const amountSign = isIncome ? '+' : '-';
        
        const html = `
            <div class="transaction-item">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-category">${tx.category || 'ไม่มีหมวดหมู่'}</div>
                    <div class="transaction-account">${tx.account || '-'}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${parseFloat(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
            </div>`;
        resultsDiv.append(html);
    });
}

// --- หน้า Add Transaction ---
function setupTransactionForm() {
    $('#trans-date').val(new Date().toISOString().split('T')[0]);

    populateSelect('#trans-account', App.accounts, 'กรุณาเลือกบัญชี');
    populateSelect('#trans-from-account', App.accounts, 'เลือกบัญชีต้นทาง');
    populateSelect('#trans-to-account', App.accounts, 'เลือกบัญชีปลายทาง');

    $('input[name="trans-type"]').change(function() {
        const type = $(this).val();
        if (type === 'โอนเงิน') {
            $('#standard-fields').hide();
            $('#transfer-fields').slideDown();
        } else {
            $('#transfer-fields').hide();
            $('#standard-fields').slideDown();
            const filteredCategories = App.categories.filter(c => c.type === type);
            populateSelect('#trans-category', filteredCategories, 'กรุณาเลือกหมวดหมู่');
        }
    }).trigger('change');

    $('#transaction-form').on('submit', handleAddTransaction);
}

async function handleAddTransaction(e) {
    e.preventDefault();
    const type = $('input[name="trans-type"]:checked').val();
    let data = { 
        type: type, 
        date: $('#trans-date').val(), 
        amount: $('#trans-amount').val(), 
        description: $('#trans-description').val() 
    };

    if (type === 'โอนเงิน') {
        data.fromAccount = $('#trans-from-account').val();
        data.toAccount = $('#trans-to-account').val();
        if (!data.fromAccount || !data.toAccount) {
            showError({message: "กรุณาเลือกบัญชีให้ครบถ้วน"});
            return;
        }
        if (data.fromAccount === data.toAccount) {
            showError({message: "ไม่สามารถโอนเข้าบัญชีเดียวกันได้"});
            return;
        }
    } else {
        data.category = $('#trans-category').val();
        data.account = $('#trans-account').val();
        if (!data.category || !data.account) {
            showError({message: "กรุณาเลือกหมวดหมู่และบัญชี"});
            return;
        }
    }
    
    if (!data.date || !data.amount || data.amount <= 0) {
        showError({ message: "กรุณากรอกวันที่และจำนวนเงินให้ถูกต้อง" });
        return;
    }

    const response = await callBackend('addTransaction', data);
    if (response.success) {
        Swal.fire({ 
            icon: 'success', 
            title: 'บันทึกสำเร็จ!', 
            timer: 1500, 
            showConfirmButton: false 
        }).then(async () => {
            // โหลดข้อมูลพื้นฐานใหม่ และกลับไปหน้า Dashboard
            await initializeApp();
        });
    } else {
        showError(response);
    }
}

// --- หน้า Cards ---
async function setupCardsPage() {
    renderAccountCards();
}

function renderAccountCards() {
    const listDiv = $('#account-cards-list').empty();
    if (!App.accounts || App.accounts.length === 0) {
        listDiv.html('<p class="text-center text-muted mt-4">ยังไม่มีบัญชีหรือบัตร</p>');
        return;
    }
    App.accounts.forEach(acc => {
        const cardHtml = `
            <div class="card account-card mb-3">
                <div class="card-body">
                    <h5 class="card-title">${acc.name}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${acc.type}</h6>
                </div>
            </div>`;
        listDiv.append(cardHtml);
    });
}


// --- หน้า Installment ---
async function setupInstallmentPage() {
    $('#active-installments-list').html('<p class="text-center text-muted p-4">ฟังก์ชันนี้ยังไม่เปิดใช้งาน</p>');
}

// --- หน้า Settings ---
function setupSettingsPage() {
    // ไม่มี Logic พิเศษนอกจากการกดปุ่มเพื่อเปิด Modal ซึ่งจัดการโดย Central Listener
}


// ===================================
//      ฟังก์ชันจัดการ Modal และฟอร์มย่อย
// ===================================
async function renderCategoryList() {
    const list = $('#category-list-in-modal').html('<li>กำลังโหลด...</li>');
    const response = await callBackend('getUserData');
    if (response.success) {
        App.categories = response.categories;
        list.empty();
        if (App.categories.length === 0) {
            list.html('<li class="list-group-item">ไม่มีหมวดหมู่</li>');
            return;
        }
        App.categories.forEach(cat => {
            list.append(`<li class="list-group-item">${cat.name} <span class="badge bg-secondary">${cat.type}</span></li>`);
        });
    } else {
        list.html('<li class="list-group-item text-danger">โหลดข้อมูลล้มเหลว</li>');
    }
}

async function renderAccountListInModal() {
    const list = $('#account-list-in-modal').html('<li>กำลังโหลด...</li>');
    const response = await callBackend('getUserData');
    if (response.success) {
        App.accounts = response.accounts;
        list.empty();
        if (App.accounts.length === 0) {
            list.html('<li class="list-group-item">ไม่มีบัญชี</li>');
            return;
        }
        App.accounts.forEach(acc => {
            list.append(`<li class="list-group-item">${acc.name} <span class="badge bg-secondary">${acc.type}</span></li>`);
        });
    } else {
        list.html('<li class="list-group-item text-danger">โหลดข้อมูลล้มเหลว</li>');
    }
}


// ===================================
//      ฟังก์ชันช่วยเหลือ (Utility)
// ===================================
function populateSelect(selectId, items, placeholderText) {
    const select = $(selectId).empty();
    select.append(`<option disabled selected value="">-- ${placeholderText} --</option>`);
    if (items && items.length > 0) {
        items.forEach(item => {
            select.append(`<option value="${item.name}">${item.name}</option>`);
        });
    }
}

function showError(error) {
    console.error("App Error:", error);
    Swal.fire({ 
        icon: 'error', 
        title: 'เกิดข้อผิดพลาด!', 
        text: (error && error.message) ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' 
    });
}