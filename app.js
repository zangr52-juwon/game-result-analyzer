// state
let appState = {
    initialized: false,
    groups: { A: [], B: [], C: [], D: [] },
    matches: { A: [], B: [], C: [], D: [] },
    standings: { A: [], B: [], C: [], D: [] },
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

// Persistence functions
function saveState() {
    localStorage.setItem('wc_tournament_state', JSON.stringify(appState));
}

function loadState() {
    const saved = localStorage.getItem('wc_tournament_state');
    if (saved) {
        appState = JSON.parse(saved);
        if (appState.initialized) {
            navBtns.group.disabled = false;
            navBtns.tournament.disabled = false;
            restoreUI();
        }
    }
}

// Navigation Logic
function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    Object.values(views).forEach(v => v.classList.remove('active'));
    Object.values(navBtns).forEach(b => b.classList.remove('active'));

    views[viewName].classList.remove('hidden');
    views[viewName].classList.add('active');
    navBtns[viewName].classList.add('active');
}

navBtns.setup.addEventListener('click', () => switchView('setup'));
navBtns.group.addEventListener('click', () => switchView('group'));
navBtns.tournament.addEventListener('click', () => switchView('tournament'));

// Setup View Logic
const btnRandom = document.getElementById('btn-distribute-random');
const bulkNames = document.getElementById('bulk-names');
const btnStart = document.getElementById('btn-start-tournament');

btnRandom.addEventListener('click', () => {
    let namesText = bulkNames.value.trim();
    let names = namesText.split('\n').map(n => n.trim()).filter(n => n);
    
    if (names.length < 20) {
        let currentLen = names.length;
        for (let i = currentLen; i < 20; i++) {
            names.push(`Player ${i + 1}`);
        }
    }
    names = names.slice(0, 20);
    names.sort(() => Math.random() - 0.5);

    const groupIds = ['A', 'B', 'C', 'D'];
    let nIdx = 0;
    groupIds.forEach(gId => {
        const container = document.getElementById(`slots-${gId}`);
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = names[nIdx++];
        });
    });
});

btnStart.addEventListener('click', () => {
    const groupIds = ['A', 'B', 'C', 'D'];
    groupIds.forEach(gId => {
        appState.groups[gId] = [];
        const container = document.getElementById(`slots-${gId}`);
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            let val = input.value.trim();
            if(!val) val = '언노운';
            appState.groups[gId].push(val);
        });
    });

    appState.initialized = true;
    initMatchesAndStandings();
    
    navBtns.group.disabled = false;
    switchView('group');
    renderGroupStage('A');
    saveState();
});

function initMatchesAndStandings() {
    const groupIds = ['A', 'B', 'C', 'D'];
    const matchupsIndices = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 2], [1, 3], [1, 4],
        [2, 3], [2, 4],
        [3, 4]
    ];

    groupIds.forEach(gId => {
        appState.matches[gId] = matchupsIndices.map((pair, idx) => ({
            id: `m_${gId}_${idx}`,
            t1Idx: pair[0],
            t2Idx: pair[1],
            t1Name: appState.groups[gId][pair[0]],
            t2Name: appState.groups[gId][pair[1]],
            s1: null,
            s2: null
        }));
        calcStandings(gId);
    });
}

// Group Stage Logic
function renderGroupStage(gId) {
    appState.currentGroupTab = gId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if(btn.dataset.group === gId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.getElementById('current-group-label').textContent = gId;

    const mContainer = document.getElementById('matches-container');
    mContainer.innerHTML = '';
    
    appState.matches[gId].forEach((m, i) => {
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
                renderGroupStage(gId);
                saveState();
            }
        });
    });

    mContainer.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const matchId = e.target.dataset.matchid;
            const team = e.target.dataset.team;
            const val = e.target.value === '' ? null : parseInt(e.target.value);
            
            const match = appState.matches[gId].find(x => x.id === matchId);
            if(team === '1') match.s1 = val;
            if(team === '2') match.s2 = val;

            calcStandings(gId);
            renderStandings(gId);
            saveState();
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
    renderGroupStage(gId);
    saveState();
});

document.getElementById('btn-copy-group-results').addEventListener('click', () => {
    let text = `🏆 조별 리그 결과 (${appState.currentGroupTab}조)\n\n[순위표]\n`;
    appState.standings[appState.currentGroupTab].forEach((t, i) => {
        text += `${i+1}위: ${t.name} (${t.pts}점 / 득실 ${t.gd})\n`;
    });
    text += `\n[경기 결과]\n`;
    appState.matches[appState.currentGroupTab].forEach(m => {
        const s1 = m.s1 !== null ? m.s1 : '-';
        const s2 = m.s2 !== null ? m.s2 : '-';
        text += `${m.t1Name} ${s1} : ${s2} ${m.t2Name}\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert('복사되었습니다!'));
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        renderGroupStage(e.target.dataset.group);
    });
});

function calcStandings(gId) {
    let teams = appState.groups[gId].map(name => ({
        name: name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
    }));
    appState.matches[gId].forEach(m => {
        if(m.s1 !== null && m.s2 !== null) {
            let t1 = teams[m.t1Idx]; let t2 = teams[m.t2Idx];
            t1.p++; t2.p++; t1.gf += m.s1; t1.ga += m.s2; t2.gf += m.s2; t2.ga += m.s1;
            if(m.s1 > m.s2) { t1.w++; t1.pts += 3; t2.l++; }
            else if (m.s1 < m.s2) { t2.w++; t2.pts += 3; t1.l++; }
            else { t1.d++; t1.pts += 1; t2.d++; t2.pts += 1; }
        }
    });
    teams.forEach(t => t.gd = t.gf - t.ga);
    teams.sort((a,b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
    appState.standings[gId] = teams;
}

function renderStandings(gId) {
    const tbody = document.getElementById('standings-tbody');
    tbody.innerHTML = '';
    appState.standings[gId].forEach((t, i) => {
        const tr = document.createElement('tr');
        if(i < 2) tr.classList.add('advance');
        tr.innerHTML = `<td>${i+1}</td><td class="team-name">${t.name}</td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gd > 0 ? '+'+t.gd : t.gd}</td><td><strong>${t.pts}</strong></td>`;
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-complete-group-stage').addEventListener('click', () => {
    let missing = 0;
    ['A','B','C','D'].forEach(g => appState.matches[g].forEach(m => { if(m.s1 === null || m.s2 === null) missing++; }));
    if(missing > 0 && !confirm(`미입력 ${missing}개. 진행?`)) return;
    navBtns.tournament.disabled = false;
    initTournament();
    switchView('tournament');
    saveState();
});

function resetAll() {
    if (confirm('초기화?')) { localStorage.removeItem('wc_tournament_state'); location.reload(); }
}

function initTournament() {
    const getT = (g, i) => appState.standings[g][i].name;
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
        root.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => evalKnockout(mId)));
    });
}

function evalKnockout(mId) {
    const root = document.getElementById(mId);
    if (!root) return;
    const mainInputs = root.querySelectorAll('.main-score');
    const psoInputs = root.querySelectorAll('.pso-score');
    const s1 = mainInputs[0].value;
    const s2 = mainInputs[1].value;
    const ps1 = psoInputs[0].value;
    const ps2 = psoInputs[1].value;
    
    appState.knockout[mId].s1 = s1;
    appState.knockout[mId].s2 = s2;
    appState.knockout[mId].ps1 = ps1;
    appState.knockout[mId].ps2 = ps2;

    root.querySelectorAll('.team').forEach(el => el.classList.remove('winner'));
    psoInputs.forEach(el => el.classList.add('hidden'));

    if(s1 === '' || s2 === '') {
        appState.knockout[mId].winner = null;
        updateDownstream(mId, null);
        saveState(); return;
    }

    const v1 = parseInt(s1); const v2 = parseInt(s2);
    if (v1 === v2) {
        psoInputs.forEach(el => el.classList.remove('hidden'));
        if (ps1 !== '' && ps2 !== '') {
            const p1 = parseInt(ps1); const p2 = parseInt(ps2);
            if (p1 > p2) highlightWinner(mId, 0);
            else if (p2 > p1) highlightWinner(mId, 1);
        }
    } else {
        if (v1 > v2) highlightWinner(mId, 0);
        else highlightWinner(mId, 1);
    }
    saveState();
}

function highlightWinner(mId, teamIdx) {
    const root = document.getElementById(mId);
    const teams = root.querySelectorAll('.team');
    teams.forEach(el => el.classList.remove('winner'));
    teams[teamIdx].classList.add('winner');
    const winnerName = teams[teamIdx].querySelector('span').textContent;
    appState.knockout[mId].winner = teamIdx;
    updateDownstream(mId, winnerName);
}

function updateDownstream(mId, winnerName) {
    const map = {qf1:['WQF1','sf1'], qf2:['WQF2','sf1'], qf3:['WQF3','sf2'], qf4:['WQF4','sf2'], sf1:['WSF1','final'], sf2:['WSF2','final']};
    if(map[mId]) { setBracketSlot(map[mId][0], winnerName || '승자'); evalKnockout(map[mId][1]); }
    if(mId === 'final') document.getElementById('champion-name').textContent = winnerName || '?';
}

function restoreUI() {
    const groupIds = ['A', 'B', 'C', 'D'];
    groupIds.forEach(gId => {
        const inputs = document.querySelectorAll(`#slots-${gId} input`);
        appState.groups[gId].forEach((name, i) => { if(inputs[i]) inputs[i].value = name; });
        calcStandings(gId);
    });
    renderGroupStage(appState.currentGroupTab);
    initTournament();
    ['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final'].forEach(mId => {
        const root = document.getElementById(mId);
        const data = appState.knockout[mId];
        const main = root.querySelectorAll('.main-score');
        const pso = root.querySelectorAll('.pso-score');
        main[0].value = data.s1; main[1].value = data.s2;
        pso[0].value = data.ps1; pso[1].value = data.ps2;
        evalKnockout(mId);
    });
}

window.addEventListener('load', () => { loadState(); lucide.createIcons(); });
