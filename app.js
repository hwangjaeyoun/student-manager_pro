// 1. Firebase 설정 (본인의 키로 교체하세요)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "student-manager-pro-d650b.firebaseapp.com",
    projectId: "student-manager-pro-d650b",
    storageBucket: "student-manager-pro-d650b.firebasestorage.app",
    messagingSenderId: "1045404403780",
    appId: "1:1045404403780:web:d2b23971b15618c6965411",
    measurementId: "G-FC4F5TJXYD"
};

// Firebase 초기화 확인
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app();
}
const db = firebase.firestore();

// 2. 전역 변수
let currentClassId = null;
let currentClassData = null;
let currentStudents = [];
let currentDate = new Date();
let selectedDateForSchedule = null;
let selectedStudentIdForManage = null;

// [수정됨] 선명한 클래스 색상 (가독성 Up: 진한 코랄, 청록, 오렌지, 보라, 진한 파랑)
const CLASS_COLORS = ['#FF6B6B', '#20C997', '#FD7E14', '#845EF7', '#339AF0'];

// 3. 탭 및 모달 관리
function switchTab(tabId) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if(tabId === 'tab-class') loadClasses();
    if(tabId === 'tab-calendar') renderCalendar();
    if(tabId === 'tab-material') loadClassesForMaterial();
}

function openModal(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'block';
}

function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) event.target.style.display = "none";
}

// 4. [탭1] 클래스 등록/수정 로직
function initColorPalette(selectedColor) {
    const palette = document.getElementById('color-palette');
    const input = document.getElementById('cls-color');
    palette.innerHTML = '';
    
    let targetColor = selectedColor;
    if(!targetColor) {
        const randomIdx = Math.floor(Math.random() * CLASS_COLORS.length);
        targetColor = CLASS_COLORS[randomIdx];
    }
    input.value = targetColor;

    CLASS_COLORS.forEach((color) => {
        const div = document.createElement('div');
        div.className = 'color-swatch';
        div.style.backgroundColor = color;
        if(color === targetColor) div.classList.add('selected');

        div.onclick = function() {
            document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            input.value = color;
        };
        palette.appendChild(div);
    });
}

function openClassModalForCreate() {
    document.getElementById('edit-class-id').value = '';
    document.getElementById('modal-class-title').innerText = '새 클래스 등록';
    
    document.getElementById('cls-name').value = '';
    const loc = document.getElementById('cls-location');
    if(loc) loc.value = ''; 
    
    document.getElementById('cls-start').value = '';
    document.getElementById('cls-end').value = '';
    document.getElementById('cls-time').value = '';
    document.getElementById('cls-fee').value = '';
    
    initColorPalette(null);
    openModal('modal-class');
}

function openClassModalForEdit(id, data) {
    document.getElementById('edit-class-id').value = id;
    document.getElementById('modal-class-title').innerText = '클래스 수정';
    
    document.getElementById('cls-name').value = data.name;
    const loc = document.getElementById('cls-location');
    if(loc) loc.value = data.location || ''; 
    
    document.getElementById('cls-start').value = data.start;
    document.getElementById('cls-end').value = data.end;
    document.getElementById('cls-day').value = data.day;
    document.getElementById('cls-time').value = data.time;
    document.getElementById('cls-fee').value = data.fee;
    
    initColorPalette(data.color);
    openModal('modal-class');
}

// [핵심] PC(테이블+재료비) 및 모바일(카드) 렌더링 함수
function loadClasses() {
    const mobileList = document.getElementById('class-list-mobile');
    const pcList = document.getElementById('class-list-pc');
    
    if (!mobileList || !pcList) return;

    mobileList.innerHTML = '';
    pcList.innerHTML = '';
    
    db.collection('classes').orderBy('createdAt', 'desc').get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const id = doc.id;
            
            const countId = `cnt-${id}`;
            const countIdPc = `cnt-pc-${id}`;
            
            const locText = d.location ? ` / 📍 ${d.location}` : '';
            const locTextOnly = d.location || '-';
            const feeText = d.fee ? Number(d.fee).toLocaleString() + '원' : '0원';

            // 날짜 포맷팅
            let dateRangeText = `${d.start} ~ ${d.end}`; 
            if(d.start && d.end) {
                const s = d.start.split('-'); 
                const e = d.end.split('-');   
                const startFmt = `${s[0].slice(2)}.${parseInt(s[1])}.${parseInt(s[2])}`;
                let endFmt = (s[0] === e[0]) ? `${parseInt(e[1])}.${parseInt(e[2])}` : `${e[0].slice(2)}.${parseInt(e[1])}.${parseInt(e[2])}`;
                dateRangeText = `${startFmt}~${endFmt}`;
            }

            // 1. 모바일용 (카드)
            const card = document.createElement('div');
            card.className = 'card';
            card.style.borderLeftColor = d.color;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>${d.name}</h4>
                    <span id="${countId}" style="background:#f0f0f0; padding:2px 8px; border-radius:10px; font-size:12px;">loading..</span>
                </div>
                <p style="margin-top:5px; font-size:12px;">📅 ${dateRangeText}</p>
                <p style="font-size:12px;">⏰ ${d.dayName} ${d.time}${locText}</p>
                <p style="font-size:12px; color:#666;">💰 재료비: ${feeText}</p>
                <div style="margin-top:10px; text-align:right;">
                    <button class="btn-outline" style="font-size:11px; padding:3px 8px;" onclick="event.stopPropagation(); editClass('${id}')">수정</button>
                    <button class="btn-outline" style="font-size:11px; padding:3px 8px; color:red; border-color:red;" onclick="event.stopPropagation(); deleteClass('${id}')">삭제</button>
                </div>
            `;
            card.onclick = () => selectClass(id, d);
            mobileList.appendChild(card);

            // 2. PC용 (테이블 행)
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer'; 
            tr.onclick = () => selectClass(id, d);

            tr.innerHTML = `
                <td><div style="width:15px; height:15px; border-radius:50%; background-color:${d.color};"></div></td>
                <td style="font-weight:bold;">${d.name}</td>
                <td>${locTextOnly}</td>
                <td style="color:#555;">${feeText}</td>
                <td style="font-size:13px; color:#666;">${dateRangeText}</td> 
                <td>${d.dayName} ${d.time}</td>
                <td><span id="${countIdPc}" style="background:#f0f0f0; padding:2px 6px; border-radius:10px; font-size:12px;">-</span></td>
                <td>
                    <button class="btn-outline" style="padding:2px 5px; font-size:12px;" onclick="event.stopPropagation(); editClass('${id}')">✏️</button>
                    <button class="btn-outline" style="padding:2px 5px; font-size:12px; color:red; border-color:red;" onclick="event.stopPropagation(); deleteClass('${id}')">🗑️</button>
                </td>
            `;
            pcList.appendChild(tr);

            // 3. 수강생 수 업데이트
            db.collection('students').where('classId', '==', id).get().then(sSnap => {
                const count = `${sSnap.size}명`;
                const mBadge = document.getElementById(countId);
                if(mBadge) mBadge.innerText = count;
                const pcBadge = document.getElementById(countIdPc);
                if(pcBadge) pcBadge.innerText = count;
            });
        });
    });
}

function editClass(id) {
    db.collection('classes').doc(id).get().then(doc => { 
        if(doc.exists) openClassModalForEdit(id, doc.data()); 
    });
}

// 클래스 저장 함수
function saveClass() {
    const id = document.getElementById('edit-class-id').value;
    const name = document.getElementById('cls-name').value;
    const locElement = document.getElementById('cls-location');
    const location = locElement ? locElement.value : '';
    const start = document.getElementById('cls-start').value;
    const end = document.getElementById('cls-end').value;
    const day = document.getElementById('cls-day').value;
    const time = document.getElementById('cls-time').value;
    const fee = document.getElementById('cls-fee').value;
    const color = document.getElementById('cls-color').value;

    if(!name || !start || !end) return alert('필수 정보를 입력하세요');
    
    const dayNames = ['일','월','화','수','목','금','토'];
    const data = { 
        name, location, 
        start, end, 
        day: parseInt(day), dayName: dayNames[parseInt(day)], 
        time, fee: Number(fee), color, 
        createdAt: new Date() 
    };

    if (id) {
        db.collection('classes').doc(id).update(data).then(() => {
            regenerateSchedules(id, name, location, color, start, end, parseInt(day), time);
            alert('수정되었습니다.');
            closeModal('modal-class');
            loadClasses();
            if(currentClassId === id) selectClass(id, data);
        }).catch(err => alert("수정 오류: " + err.message));
    } else {
        db.collection('classes').add(data).then((docRef) => {
            generateSchedules(docRef.id, name, location, color, start, end, parseInt(day), time);
            alert('등록되었습니다.');
            closeModal('modal-class');
            loadClasses();
        }).catch(err => alert("등록 오류: " + err.message));
    }
}

function deleteClass(id) {
    if(!confirm("클래스를 삭제하시겠습니까? 일정까지 모두 삭제됩니다.")) return;
    db.collection('classes').doc(id).delete().then(() => {
        db.collection('schedules').where('classId', '==', id).get().then(snap => {
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        }).then(() => {
            alert('삭제되었습니다.');
            loadClasses();
            if(currentClassId === id) {
                document.getElementById('current-class-title').innerText = '클래스를 선택하세요';
                document.getElementById('student-actions').style.display = 'none';
                document.getElementById('student-list-mobile').innerHTML = '';
                document.getElementById('student-list-pc').innerHTML = '';
                currentClassId = null;
            }
        });
    });
}

// 5. 일정 생성 로직
function generateSchedules(classId, className, location, color, start, end, dayOfWeek, time) {
    let sDate = new Date(start);
    let eDate = new Date(end);
    const batch = db.batch();
    
    while(sDate <= eDate) {
        if(sDate.getDay() === dayOfWeek) {
            const dateStr = sDate.toISOString().split('T')[0];
            const newRef = db.collection('schedules').doc();
            batch.set(newRef, { 
                classId, className, location: location || '', 
                color, time, date: dateStr 
            });
        }
        sDate.setDate(sDate.getDate() + 1);
    }
    batch.commit();
}

function regenerateSchedules(classId, className, location, color, start, end, dayOfWeek, time) {
    db.collection('schedules').where('classId', '==', classId).get().then(snap => {
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => {
        generateSchedules(classId, className, location, color, start, end, dayOfWeek, time);
    });
}

// 6. [탭1] 수강생 관리
function selectClass(id, data) {
    console.log("Class Selected:", id); 
    currentClassId = id;
    currentClassData = data;
    document.getElementById('current-class-title').innerText = data.name;
    document.getElementById('student-actions').style.display = 'block';
    
    if(window.innerWidth < 768) {
        document.querySelector('.right-panel').scrollIntoView({behavior:"smooth"});
        document.querySelector('.split-layout').classList.add('mobile-view-mode'); // 모바일 화면전환
    }
    
    loadStudents();
}

// 모바일 뒤로가기
function backToClassList() {
    document.querySelector('.split-layout').classList.remove('mobile-view-mode');
}

function openStudentModal() {
    if(!currentClassId) return alert('먼저 클래스를 선택해주세요.');
    
    document.getElementById('edit-student-id').value = '';
    document.getElementById('modal-student-title').innerText = '수강생 등록';
    document.getElementById('std-class-id').value = currentClassId;
    
    document.getElementById('std-name').value = '';
    document.getElementById('std-phone').value = '';
    document.getElementById('std-memo').value = '';
    
    openModal('modal-student');
}

// [수정됨] 수강생 리스트
function loadStudents() {
    const mobileList = document.getElementById('student-list-mobile');
    const pcList = document.getElementById('student-list-pc');
    
    if (!mobileList || !pcList) return;

    mobileList.innerHTML = '';
    pcList.innerHTML = '';
    currentStudents = []; 

    db.collection('students').where('classId', '==', currentClassId).get().then(snap => {
        
        if(snap.empty) {
            const emptyMsg = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">등록된 수강생이 없습니다.</td></tr>';
            pcList.innerHTML = emptyMsg;
            mobileList.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">등록된 수강생이 없습니다.</div>';
            return;
        }

        // 1. 모바일용 귀여운 테이블 (Header)
        let mobileTableHtml = `
            <table class="cute-table">
                <thead>
                    <tr>
                        <th width="10%">v</th>
                        <th width="50%">정보</th>
                        <th width="40%">관리</th>
                    </tr>
                </thead>
                <tbody>
        `;

        snap.forEach(doc => {
            const s = doc.data();
            const id = doc.id;
            currentStudents.push(s);

            const memoText = s.memo ? `<span class="mobile-memo">${s.memo}</span>` : '';

            // 1-1. 모바일용 (테이블 행)
            mobileTableHtml += `
                <tr>
                    <td><input type="checkbox" name="student-chk-m" value="${s.phone}"></td>
                    <td style="text-align:left; padding-left:10px;">
                        <span class="mobile-name">${s.name}</span>
                        <span class="mobile-phone">${s.phone}</span>
                        ${memoText}
                    </td>
                    <td>
                        <div style="display:flex; justify-content:center; align-items:center;">
                            <a href="tel:${s.phone}" class="btn-big-phone">📞</a>
                            <button class="btn-manage-sm" onclick="openManageModal('${id}')">관리</button>
                        </div>
                    </td>
                </tr>
            `;

            // 2. PC용 (테이블 행)
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:bold;">${s.name}</td>
                <td>${s.phone}</td>
                <td style="color:#666;">${s.memo || '-'}</td>
                <td>
                    <button class="btn-outline" style="font-size:11px; padding:2px 5px;" onclick="editStudent('${id}')">✏️</button>
                    <button class="btn-outline" style="font-size:11px; color:red; border-color:red; padding:2px 5px;" onclick="deleteStudent('${id}')">🗑️</button>
                </td>
            `;
            pcList.appendChild(tr);
        });

        mobileTableHtml += `</tbody></table>`;
        mobileList.innerHTML = mobileTableHtml;

    }).catch(error => {
        console.error("Error fetching students:", error);
    });
}

function openManageModal(id) {
    selectedStudentIdForManage = id;
    openModal('modal-student-manage');
}

function openEditFromManage() {
    closeModal('modal-student-manage');
    editStudent(selectedStudentIdForManage);
}

function deleteFromManage() {
    closeModal('modal-student-manage');
    deleteStudent(selectedStudentIdForManage);
}

function editStudent(id) {
    db.collection('students').doc(id).get().then(doc => {
        if(doc.exists) {
            const data = doc.data();
            document.getElementById('edit-student-id').value = id;
            document.getElementById('modal-student-title').innerText = '수강생 수정';
            document.getElementById('std-class-id').value = data.classId;
            document.getElementById('std-name').value = data.name;
            document.getElementById('std-phone').value = data.phone;
            document.getElementById('std-memo').value = data.memo;
            openModal('modal-student');
        }
    });
}

function deleteStudent(id) {
    if(!confirm("이 수강생을 삭제하시겠습니까? (구매 내역 등은 유지됩니다)")) return;
    
    db.collection('students').doc(id).delete().then(() => {
        alert('삭제되었습니다.');
        loadStudents(); 
        loadClasses(); 
    });
}

function saveStudent() {
    const id = document.getElementById('edit-student-id').value;
    const name = document.getElementById('std-name').value;
    const phone = document.getElementById('std-phone').value;
    const memo = document.getElementById('std-memo').value;
    const classId = document.getElementById('std-class-id').value;

    if(!name || !classId) return alert('이름을 입력해주세요.');

    const data = { classId, name, phone, memo };

    if (id) {
        db.collection('students').doc(id).update(data).then(() => {
            alert('수정되었습니다.');
            closeModal('modal-student');
            loadStudents();
        });
    } else {
        data.joinedAt = new Date();
        db.collection('students').add(data).then(() => {
            alert('등록되었습니다.');
            closeModal('modal-student');
            loadStudents(); 
            loadClasses();
        });
    }
}

function sendGroupSMS() {
    let checkboxes = document.querySelectorAll('input[name="student-chk-m"]:checked');

    if(checkboxes.length === 0) return alert('문자를 보낼 수강생을 선택해주세요.');

    const phones = Array.from(checkboxes).map(cb => cb.value).join(',');
    const msg = `[${currentClassData.name}-단체공지] 내용: `;
    
    location.href = `sms:${phones}?body=${encodeURIComponent(msg)}`;
}

// 7. [탭2] 캘린더 로직
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('cal-month-title').innerText = `${year}.${String(month+1).padStart(2,'0')}`;
    
    // 요일 헤더
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(day => {
        grid.innerHTML += `<div class="cal-day-header">${day}</div>`;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div class="cal-cell"></div>`;

    for(let d=1; d<=lastDate; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        grid.innerHTML += `<div class="cal-cell" id="day-${dateStr}" onclick="showDayDetail('${dateStr}')">
            <span>${d}</span>
            <div class="dots-area" id="dots-${dateStr}"></div>
        </div>`;
    }
    loadSchedulesForMonth(year, month);
}

function changeMonth(delta) { 
    currentDate.setMonth(currentDate.getMonth() + delta); 
    renderCalendar(); 
}

function loadSchedulesForMonth(year, month) {
    const startStr = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const endStr = `${year}-${String(month+1).padStart(2,'0')}-31`;
    db.collection('schedules').where('date', '>=', startStr).where('date', '<=', endStr).get().then(snap => {
        snap.forEach(doc => {
            const sch = doc.data();
            const area = document.getElementById(`dots-${sch.date}`);
            if(area) {
                const dot = document.createElement('span');
                dot.className = 'cal-dot';
                dot.style.backgroundColor = sch.color;
                // [수정됨] 점 대신 이름 표시 (1~2글자)
                dot.innerText = sch.className.substring(0, 5); 
                area.appendChild(dot);
            }
        });
    });
}

function showDayDetail(dateStr) {
    selectedDateForSchedule = dateStr;
    document.getElementById('schedule-date-title').innerHTML = `${dateStr} 일정 상세 <span class="close" onclick="closeModal('modal-schedule-detail')">&times;</span>`;
    
    const list = document.getElementById('modal-schedule-list');
    list.innerHTML = '로딩중...';
    db.collection('schedules').where('date', '==', dateStr).get().then(snap => {
        list.innerHTML = '';
        if(snap.empty) list.innerHTML = '<li style="color:#aaa; text-align:center;">일정이 없습니다.</li>';
        snap.forEach(doc => {
            const d = doc.data();
            const locationStr = d.location ? `(📍${d.location})` : '';
            
            list.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${d.color}; padding-left:10px; margin-bottom:8px;">
                <span>
                    <span style="font-weight:bold;">${d.className}</span> 
                    <span style="color:#666; font-size:13px;">/ ${d.time} ${locationStr}</span>
                </span>
                <button class="btn-outline" style="color:red; border-color:red; font-size:11px; padding:2px 6px;" onclick="deleteSchedule('${doc.id}')">삭제</button>
            </li>`;
        });
    });

    loadValidClassesForDate(dateStr);
    openModal('modal-schedule-detail');
}

function deleteSchedule(id) {
    if(!confirm("이 일정을 삭제하시겠습니까?")) return;
    
    db.collection('schedules').doc(id).delete().then(() => {
        showDayDetail(selectedDateForSchedule);
        renderCalendar();
    });
}

function loadValidClassesForDate(dateStr) {
    const select = document.getElementById('manual-class-select');
    select.innerHTML = '<option value="">클래스를 선택하세요</option>';
    const targetDate = new Date(dateStr);
    db.collection('classes').get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const start = new Date(d.start);
            const end = new Date(d.end);
            if (targetDate >= start && targetDate <= end) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.text = d.name;
                option.dataset.name = d.name;
                option.dataset.time = d.time;
                option.dataset.color = d.color;
                option.dataset.location = d.location || ''; 
                select.appendChild(option);
            }
        });
    });
}

function addManualSchedule() {
    const select = document.getElementById('manual-class-select');
    const classId = select.value;
    if(!classId || !selectedDateForSchedule) return alert('클래스를 선택해주세요.');
    const option = select.options[select.selectedIndex];
    
    db.collection('schedules').add({
        classId: classId,
        className: option.dataset.name,
        date: selectedDateForSchedule,
        time: option.dataset.time,
        color: option.dataset.color,
        location: option.dataset.location,
        isManual: true
    }).then(() => {
        alert('추가되었습니다.');
        showDayDetail(selectedDateForSchedule);
        renderCalendar();
    });
}

// 8. [탭3] 재료비 관리
function loadClassesForMaterial() {
    const sel = document.getElementById('material-class-select');
    sel.innerHTML = '<option value="">클래스 선택</option>';
    db.collection('classes').get().then(snap => {
        snap.forEach(doc => {
            const op = document.createElement('option');
            op.value = doc.id;
            op.text = doc.data().name;
            sel.appendChild(op);
        });
    });
}

function loadMaterialLedger() {
    const classId = document.getElementById('material-class-select').value;
    if(!classId) return;
    db.collection('classes').doc(classId).get().then(doc => {
        const basicFee = doc.exists ? (doc.data().fee || 0) : 0;
        renderLedgerRows(classId, basicFee);
    });
}

function renderLedgerRows(classId, basicFee) {
    const container = document.getElementById('ledger-list');
    container.innerHTML = '로딩중...';
    db.collection('students').where('classId', '==', classId).get().then(async (snap) => {
        container.innerHTML = '';
        for (const doc of snap.docs) {
            const student = doc.data();
            const studentId = doc.id;
            const purSnap = await db.collection('purchases').where('studentId', '==', studentId).orderBy('date').get();
            let html = '';
            let totalUnpaid = 0;
            if(basicFee > 0) {
                html += `<div class="ledger-item" style="background:#fff5f5; padding:5px; border-radius:4px;"><span>🔹 기본 재료비</span><span>${Number(basicFee).toLocaleString()}원</span></div>`;
                totalUnpaid += Number(basicFee);
            }
            purSnap.forEach(pDoc => {
                const p = pDoc.data();
                html += `<div class="ledger-item"><span>${p.date.slice(5)} ${p.itemName}</span><span>${p.price.toLocaleString()}원</span></div>`;
                totalUnpaid += p.price;
            });
            const card = document.createElement('div');
            card.className = 'ledger-card';
            card.innerHTML = `
                <div class="ledger-header"><span>${student.name}</span><span class="unpaid">합계: ${totalUnpaid.toLocaleString()}원</span></div>
                <div style="margin:10px 0;">${html}</div>
                <button class="btn-primary-sm" style="width:100%;" onclick="openPurchaseModal('${studentId}')">+ 추가 재료 등록</button>
            `;
            container.appendChild(card);
        }
    });
}

// 9. 마스터/구매 공통
function saveMasterItem() {
    const name = document.getElementById('master-name').value;
    const price = document.getElementById('master-price').value;
    db.collection('materials_master').add({ name, price: Number(price) }).then(()=>{ alert('추가됨'); loadMasterList(); });
}

function loadMasterList() {
    const ul = document.getElementById('master-list');
    ul.innerHTML = '';
    db.collection('materials_master').get().then(snap => { snap.forEach(doc => { ul.innerHTML += `<li>${doc.data().name} (${doc.data().price}원)</li>`; }); });
}

function openPurchaseModal(studentId) {
    document.getElementById('pur-student-id').value = studentId;
    document.getElementById('pur-date').valueAsDate = new Date();
    const sel = document.getElementById('pur-item-select');
    sel.innerHTML = '<option value="">선택하세요</option>';
    db.collection('materials_master').get().then(snap => {
        snap.forEach(doc => {
            const op = document.createElement('option');
            op.value = doc.id;
            op.text = doc.data().name;
            op.dataset.price = doc.data().price;
            sel.appendChild(op);
        });
    });
    openModal('modal-purchase');
}

function updatePriceInput() {
    const sel = document.getElementById('pur-item-select');
    const price = sel.options[sel.selectedIndex].dataset.price;
    if(price) document.getElementById('pur-price').value = price;
}

function savePurchase() {
    const studentId = document.getElementById('pur-student-id').value;
    const date = document.getElementById('pur-date').value;
    const sel = document.getElementById('pur-item-select');
    const price = document.getElementById('pur-price').value;
    if(!sel.value) return alert('품목을 선택하세요');
    db.collection('purchases').add({ studentId, date, itemName: sel.options[sel.selectedIndex].text, price: Number(price), isPaid: false }).then(() => {
        alert('저장되었습니다.'); closeModal('modal-purchase'); loadMaterialLedger();
    });
}

// [초기 실행]
document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
});