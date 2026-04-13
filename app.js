// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD-Wz-OUZxqo50pCOBUXsT-wrFefxHJ1nY",
    authDomain: "balsworldcup.firebaseapp.com",
    databaseURL: "https://balsworldcup-default-rtdb.firebaseio.com",
    projectId: "balsworldcup",
    storageBucket: "balsworldcup.firebasestorage.app",
    messagingSenderId: "775500023105",
    appId: "1:775500023105:web:5df9a2ec65be7bc6110dc0",
    measurementId: "G-SQCT91S51P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tournamentRef = db.ref('tournament_state');

// state
let appState = {
    initialized: false,
    groups: { A: [], B: [], C: [], D: [] },
    matches: { A: [], B: [], C: [], D: [] },
    standings: { A: [], B: [], C: [], D: [] },
    currentView: 'setup',
    currentGroupTab: 'A',
    knockout: {
        qf1: { s1: '', s2: '', ps1: '', ps2: '', winner: null },
        qf2: { s1: '', s2: '', ps1: '', ps2: '', winner: null },
        qf3: { s1: '', s2: '', ps1: '', ps2: '', winner: null },
        qf4: { s1: '', s2: '', ps1: '', ps2: '', winner: null },
        sf1: { s1: '', s2: '', ps1: '', ps2: '', winner: null },
        sf2: { s1: '', s2: '', ps1: '', ps2: '', winner: null },
        final: { s1: '', s2: '', ps1: '', ps2: '', winner: null }
    }
};

let isInitialLoad = true;

// DOM Elements
const views = {
    setup: document.getElementById('view-setup'),
    group: document.getElementById('view-group'),
    tournament: document.getElementById('view-tournament')
};
const navBtns = {
    setup: document.getElementById('nav-setup'),
    group: document.getElementById('nav-group'),
    tournament: document.getElementById('nav-tournament')
};

// Real-time Sync Logic
function saveState() {
    if (isInitialLoad) return; // 데이터를 불러오는 중에는 저장하지 않음
    tournamentRef.set(appState);
}

function startSync() {
    tournamentRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            appState = data;
            isInitialLoad = false; // 데이터 로드 완료
            restoreUI();
        } else {
            isInitialLoad = false; // 데이터가 없는 경우에도 로드 완료로 간주
        }
    });
}

// Navigation Logic
function switchView(viewName) {
    appState.currentView = viewName;
    Object.values(views).forEach(v => { v.classList.add('hidden'); v.classList.remove('active'); });
    Object.values(navBtns).forEach(b => b.classList.remove('active'));

    views[viewName].classList.remove('hidden');
    views[viewName].classList.add('active');
    navBtns[viewName].classList.add('active');
    
    if (appState.initialized) {
        navBtns.group.disabled = false;
        navBtns.tournament.disabled = false;
    }
}

navBtns.setup.addEventListener('click', () => { switchView('setup'); saveState(); });
navBtns.group.addEventListener('click', () => { switchView('group'); saveState(); });
navBtns.tournament.addEventListener('click', () => { switchView('tournament'); saveState(); });

// Setup View Logic
const btnRandom = document.getElementById('btn-distribute-random');
const bulkNames = document.getElementById('bulk-names');
const btnStart = document.getElementById('btn-start-tournament');

// Setup input listeners to save even before starting
function attachSetupListeners() {
    const groupIds = ['A', 'B', 'C', 'D'];
    groupIds.forEach(gId => {
        const inputs = document.querySelectorAll(`#slots-${gId} input`);
        inputs.forEach((input, i) => {
            input.addEventListener('input', () => {
                if (!appState.groups[gId]) appState.groups[gId] = [];
                appState.groups[gId][i] = input.value.trim();
                saveState();
            });
        });
    });
}

btnRandom.addEventListener('click', () => {
    let namesText = bulkNames.value.trim();
    let names = namesText.split('\n').map(n => n.trim()).filter(n => n);
    while (names.length < 20) names.push(`Player ${names.length + 1}`);
    names = names.slice(0, 20);
    names.sort(() => Math.random() - 0.5);

    const groupIds = ['A', 'B', 'C', 'D'];
    let nIdx = 0;
    groupIds.forEach(gId => {
        const inputs = document.querySelectorAll(`#slots-${gId} input`);
        inputs.forEach((input, i) => {
            input.value = names[nIdx++];
            appState.groups[gId][i] = input.value;
        });
    });
    saveState();
});

btnStart.addEventListener('click', () => {
    const groupIds = ['A', 'B', 'C', 'D'];
    groupIds.forEach(gId => {
        appState.groups[gId] = [];
        const inputs = document.querySelectorAll(`#slots-${gId} input`);
        inputs.forEach(input => {
            appState.groups[gId].push(input.value.trim() || '언노운');
        });
    });

    appState.initialized = true;
    initMatchesAndStandings();
    switchView('group');
    renderGroupStage('A');
    saveState();
});

function initMatchesAndStandings() {
    const groupIds = ['A', 'B', 'C', 'D'];
    const matchupsIndices = [[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]];

    groupIds.forEach(gId => {
        appState.matches[gId] = matchupsIndices.map((pair, idx) => ({
            id: `m_${gId}_${idx}`,
            t1Idx: pair[0], t2Idx: pair[1],
            t1Name: appState.groups[gId][pair[0]],
            t2Name: appState.groups[gId][pair[1]],
            s1: null, s2: null
        }));
        calcStandings(gId);
    });
}

function renderGroupStage(gId) {
    appState.currentGroupTab = gId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if(btn.dataset.group === gId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.getElementById('current-group-label').textContent = gId;

    const mContainer = document.getElementById('matches-container');
    mContainer.innerHTML = '';
    
    if (appState.matches[gId]) {
        appState.matches[gId].forEach((m) => {
            const mEl = document.createElement('div');
            mEl.className = 'match-item';
            mEl.innerHTML = `
                <div class="match-team name-editable" data-idx="${m.t1Idx}">${m.t1Name}</div>
                <div class="match-score">
                    <input type="number" min="0" data-matchid="${m.id}" data-team="1" value="${m.s1 !== null ? m.s1 : ''}">
                    <span>:</span>
                    <input type="number" min="0" data-matchid="${m.id}" data-team="2" value="${m.s2 !== null ? m.s2 : ''}">
                </div>
                <div class="match-team name-editable" data-idx="${m.t2Idx}">${m.t2Name}</div>
            `;
            mContainer.appendChild(mEl);
        });
    }

    mContainer.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const matchId = e.target.dataset.matchid;
            const team = e.target.dataset.team;
            const val = e.target.value === '' ? null : parseInt(e.target.value);
            const match = appState.matches[gId].find(x => x.id === matchId);
            if(team === '1') match.s1 = val;
            if(team === '2') match.s2 = val;
            calcStandings(gId);
            saveState();
        });
    });

    mContainer.querySelectorAll('.name-editable').forEach(el => {
        el.addEventListener('click', () => {
            const currentName = el.textContent;
            const newName = prompt('이름 수정:', currentName);
            if (newName && newName.trim() !== currentName) {
                const idx = parseInt(el.dataset.idx);
                appState.groups[gId][idx] = newName.trim();
                appState.matches[gId].forEach(match => {
                    if (match.t1Idx === idx) match.t1Name = newName.trim();
                    if (match.t2Idx === idx) match.t2Name = newName.trim();
                });
                saveState();
            }
        });
    });

    renderStandings(gId);
}

document.getElementById('btn-fill-random-scores').addEventListener('click', () => {
    const gId = appState.currentGroupTab;
    appState.matches[gId].forEach(m => {
        if(m.s1 === null) m.s1 = Math.floor(Math.random() * 5);
        if(m.s2 === null) m.s2 = Math.floor(Math.random() * 5);
    });
    calcStandings(gId);
    saveState();
});

document.getElementById('btn-copy-group-results').addEventListener('click', () => {
    let text = `🏆 BALS WORLD CUP 조별 결과 (${appState.currentGroupTab}조)\n\n[순위표]\n`;
    appState.standings[appState.currentGroupTab].forEach((t, i) => {
        text += `${i+1}위: ${t.name} (${t.pts}점 / 득실 ${t.gd})\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert('결과가 복사되었습니다!'));
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        appState.currentGroupTab = e.target.dataset.group;
        renderGroupStage(appState.currentGroupTab);
        saveState();
    });
});

function calcStandings(gId) {
    if (!appState.groups[gId]) return;
    let teams = appState.groups[gId].map(name => ({ name, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 }));
    if (appState.matches[gId]) {
        appState.matches[gId].forEach(m => {
            if(m.s1 !== null && m.s2 !== null) {
                let t1 = teams[m.t1Idx], t2 = teams[m.t2Idx];
                if (!t1 || !t2) return;
                t1.p++; t2.p++; t1.gf += m.s1; t1.ga += m.s2; t2.gf += m.s2; t2.ga += m.s1;
                if(m.s1 > m.s2) { t1.w++; t1.pts += 3; t2.l++; }
                else if (m.s1 < m.s2) { t2.w++; t2.pts += 3; t1.l++; }
                else { t1.d++; t1.pts += 1; t2.d++; t2.pts += 1; }
            }
        });
    }
    teams.forEach(t => t.gd = t.gf - t.ga);
    teams.sort((a,b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
    appState.standings[gId] = teams;
}

function renderStandings(gId) {
    const tbody = document.getElementById('standings-tbody');
    tbody.innerHTML = '';
    if (appState.standings[gId]) {
        appState.standings[gId].forEach((t, i) => {
            const tr = document.createElement('tr');
            if(i < 2) tr.classList.add('advance');
            tr.innerHTML = `<td>${i+1}</td><td class="team-name">${t.name}</td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gd > 0 ? '+'+t.gd : t.gd}</td><td><strong>${t.pts}</strong></td>`;
            tbody.appendChild(tr);
        });
    }
}

document.getElementById('btn-complete-group-stage').addEventListener('click', () => {
    switchView('tournament');
    saveState();
});

function resetAll() {
    if (confirm('모든 데이터를 초기화?')) {
        tournamentRef.remove();
        location.reload();
    }
}

function initTournament() {
    const getT = (g, i) => (appState.standings[g] && appState.standings[g][i]) ? appState.standings[g][i].name : '-';
    setBracketSlot('1A', getT('A',0)); setBracketSlot('2B', getT('B',1));
    setBracketSlot('1C', getT('C',0)); setBracketSlot('2D', getT('D',1));
    setBracketSlot('1B', getT('B',0)); setBracketSlot('2A', getT('A',1));
    setBracketSlot('1D', getT('D',0)); setBracketSlot('2C', getT('C',1));
    attachKnockoutEvents();
}

function setBracketSlot(slotCode, name) {
    document.querySelectorAll(`[data-slot="${slotCode}"] span`).forEach(n => n.textContent = name);
}

function attachKnockoutEvents() {
    ['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final'].forEach(mId => {
        const root = document.getElementById(mId);
        root.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('input', () => {
                const main = root.querySelectorAll('.main-score');
                const pso = root.querySelectorAll('.pso-score');
                appState.knockout[mId].s1 = main[0].value;
                appState.knockout[mId].s2 = main[1].value;
                appState.knockout[mId].ps1 = pso[0].value;
                appState.knockout[mId].ps2 = pso[1].value;
                saveState();
            });
        });
    });
}

function evalKnockout(mId) {
    const root = document.getElementById(mId);
    if (!root) return;
    const data = appState.knockout[mId];
    const teams = root.querySelectorAll('.team');
    const pso = root.querySelectorAll('.pso-score');
    
    teams.forEach(el => el.classList.remove('winner'));
    pso.forEach(el => el.classList.add('hidden'));

    if (!data || data.s1 === '' || data.s2 === '') { updateDownstream(mId, null); return; }

    const v1 = parseInt(data.s1), v2 = parseInt(data.s2);
    if (v1 === v2) {
        pso.forEach(el => el.classList.remove('hidden'));
        if (data.ps1 !== '' && data.ps2 !== '') {
            const p1 = parseInt(data.ps1), p2 = parseInt(data.ps2);
            if (p1 > p2) { teams[0].classList.add('winner'); updateDownstream(mId, teams[0].querySelector('span').textContent); }
            else if (p2 > p1) { teams[1].classList.add('winner'); updateDownstream(mId, teams[1].querySelector('span').textContent); }
        }
    } else {
        const winIdx = v1 > v2 ? 0 : 1;
        teams[winIdx].classList.add('winner');
        updateDownstream(mId, teams[winIdx].querySelector('span').textContent);
    }
}

function updateDownstream(mId, winnerName) {
    const map = {qf1:['WQF1','sf1'], qf2:['WQF2','sf1'], qf3:['WQF3','sf2'], qf4:['WQF4','sf2'], sf1:['WSF1','final'], sf2:['WSF2','final']};
    if(map[mId]) { setBracketSlot(map[mId][0], winnerName || '승자'); }
    if(mId === 'final') document.getElementById('champion-name').textContent = winnerName || '?';
}

function restoreUI() {
    if (appState.currentView) {
        switchView(appState.currentView);
    }

    const groupIds = ['A', 'B', 'C', 'D'];
    groupIds.forEach(gId => {
        const inputs = document.querySelectorAll(`#slots-${gId} input`);
        if (appState.groups[gId]) {
            appState.groups[gId].forEach((name, i) => { if(inputs[i]) inputs[i].value = name; });
        }
        calcStandings(gId);
    });

    renderGroupStage(appState.currentGroupTab);
    initTournament();
    
    ['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final'].forEach(mId => {
        const root = document.getElementById(mId);
        const data = appState.knockout[mId];
        if (data) {
            const main = root.querySelectorAll('.main-score');
            const pso = root.querySelectorAll('.pso-score');
            main[0].value = data.s1; main[1].value = data.s2;
            pso[0].value = data.ps1; pso[1].value = data.ps2;
            evalKnockout(mId);
        }
    });
}

// Global Init
window.addEventListener('load', () => {
    attachSetupListeners();
    startSync();
    lucide.createIcons();
});
