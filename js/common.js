/**
 * common.js — 一网统飞仿真原型共享模块
 * 提供：Mock数据、导航、SimulationPanel基础、Tooltip CSS注入
 */

// ─── 会话状态 ───────────────────────────────────────────────
window.SIM = window.SIM || {};

try {
  SIM.session = JSON.parse(localStorage.getItem('ywsf_session') || 'null');
} catch (e) {
  SIM.session = null;
}

/** 渠道：委办局侧仅 H5；运营侧 PC 为 operator / observer（观察员=运营账号+委办局授权范围） */
SIM.H5_ROLES = ['ADMIN', 'EXECUTOR'];
SIM.PC_ROLES = ['OPERATOR', 'OBSERVER'];

SIM.saveSession = () => localStorage.setItem('ywsf_session', JSON.stringify(SIM.session));

/** 观察员可见数据范围（该局 deptId）；运营人员返回 null 表示不做局过滤 */
SIM.getScopeDeptId = function(s) {
  s = s || SIM.session;
  if (!s || s.role !== 'OBSERVER') return null;
  return s.scopeDeptId || (s.user && s.user.deptId) || null;
};

SIM.isPcObserver = function() {
  return !!(SIM.session && SIM.session.role === 'OBSERVER');
};

/** 登录后同步内存会话（登录页写入 localStorage 后调用） */
SIM.reloadSession = function() {
  try {
    SIM.session = JSON.parse(localStorage.getItem('ywsf_session') || 'null');
  } catch (e) {
    SIM.session = null;
  }
};

SIM.logout = () => {
  localStorage.removeItem('ywsf_session');
  const p = (window.location.pathname || '').replace(/\\/g, '/');
  const href = p.indexOf('/pc/') !== -1 ? 'login.html' : '../h5/login.html';
  window.location.replace(href);
};

/** PC 顶栏：根据仿真会话填充 #header-user */
SIM.bindPcHeaderUser = function() {
  const el = document.getElementById('header-user');
  if (!el) return;
  const u = SIM.session && SIM.session.user;
  if (!u) {
    el.textContent = '未登录';
    return;
  }
  const r = SIM.session.role;
  let roleLabel = '运营人员';
  if (r === 'OBSERVER') roleLabel = '观察员';
  else if (r === 'OPERATOR') roleLabel = '运营人员';
  el.textContent = u.name + ' · ' + roleLabel;
};

// ─── 导航 ───────────────────────────────────────────────────
SIM.nav = {
  push: (url) => { window.location.href = url; },
  replace: (url) => { window.location.replace(url); },
  back: () => { window.history.back(); }
};

/** Demo：仿真切换角色后统一回到对应端首页（非生产鉴权） */
SIM.getSimHomeHref = function() {
  const p = (window.location.pathname || '').replace(/\\/g, '/');
  return p.indexOf('/pc/') !== -1 ? 'workorder_list.html' : 'home.html';
};

/**
 * 按渠道纠偏：委办局账号不得停留在 PC 业务页；运营/观察员账号不得停留在 H5。
 * 未登录访问 PC 业务页 → PC 登录；PC 业务页会话非法 → 对应端登录。
 */
SIM.applyChannelGuard = function() {
  const p = (window.location.pathname || '').replace(/\\/g, '/');
  const inPc = p.indexOf('/pc/') !== -1;
  const inH5 = p.indexOf('/h5/') !== -1;
  if (!inPc && !inH5) return;
  const file = (p.split('/').pop() || '').toLowerCase();
  if (file === 'login.html') return;
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem('ywsf_session') || 'null');
  } catch (e) {}
  if (inH5 && s && (s.role === 'OPERATOR' || s.role === 'OBSERVER')) {
    window.location.replace('../pc/workorder_list.html');
    return;
  }
  if (!inPc) return;
  if (!s || !s.role) {
    window.location.replace('login.html');
    return;
  }
  if (s.role === 'ADMIN' || s.role === 'EXECUTOR') {
    window.location.replace('../h5/login.html');
    return;
  }
  if (s.role !== 'OPERATOR' && s.role !== 'OBSERVER') {
    window.location.replace('login.html');
  }
};
SIM.applyChannelGuard();

/** PRD §1.3：执行人员无 H5 任务监控；任务/架次链路子页禁止直链（仿真） */
SIM.guardExecutorNoTaskMonitorPages = function() {
  const s = SIM.session || JSON.parse(localStorage.getItem('ywsf_session') || 'null');
  if (s && s.role === 'EXECUTOR') {
    window.location.replace('home.html');
    return true;
  }
  return false;
};

// ─── Mock数据 ────────────────────────────────────────────────
SIM.data = {
  depts: [
    { id: 'D001', name: '龙岗区交通局' },
    { id: 'D002', name: '南山区交通局' },
    { id: 'D003', name: '宝安区交通局' }
  ],

  users: [
    { id: 'U001', name: '张三', role: 'ADMIN', deptId: 'D001', phone: '13800138001', status: 'ACTIVE' },
    { id: 'U002', name: '李四', role: 'EXECUTOR', deptId: 'D001', phone: '13800138002', status: 'ACTIVE' },
    { id: 'U003', name: '王五', role: 'EXECUTOR', deptId: 'D001', phone: '13800138003', status: 'ACTIVE' },
    { id: 'U004', name: '赵六', role: 'EXECUTOR', deptId: 'D001', phone: '13800138004', status: 'INACTIVE' },
    { id: 'U005', name: '陈七', role: 'ADMIN', deptId: 'D002', phone: '13800138005', status: 'ACTIVE' }
  ],

  workorders: [
    {
      id: 'WO-2026-0415-001', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0415-001', taskName: '龙岗G94巡检任务',
      stationAddr: '龙岗G94 K22+400', status: 'PENDING_REVIEW',
      assigneeId: 'U002', assigneeName: '李四',
      dispatchNote: '请重点核查K22段护栏',
      dispatchedAt: '2026-04-15 08:30', viewedAt: '2026-04-15 09:00',
      submittedAt: '2026-04-15 11:45', createdAt: '2026-04-15 07:00',
      anomalyMedia: [
        { id: 'M001', addr: '龙岗G94 K22+400', type: '路面破损', confidence: 0.91,
          gpsLat: 22.7231, gpsLng: 114.2456, gpsConfirmedAt: '2026-04-15 10:15',
          sitePhotos: ['photo1.jpg', 'photo2.jpg'], siteNote: '路面有明显裂缝，约5m²' },
        { id: 'M002', addr: '龙岗G94 K23+100', type: '护栏损坏', confidence: 0.86,
          gpsLat: 22.7298, gpsLng: 114.2512, gpsConfirmedAt: '2026-04-15 10:45',
          sitePhotos: ['photo3.jpg'], siteNote: '' }
      ]
    },
    {
      id: 'WO-2026-0415-002', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0414-003', taskName: '坪山河道巡检任务',
      stationAddr: '坪山河 K5+200', status: 'PENDING_ASSIGN',
      assigneeId: null, assigneeName: null,
      dispatchNote: null, dispatchedAt: null, viewedAt: null, submittedAt: null,
      createdAt: '2026-04-14 16:20',
      anomalyMedia: [
        { id: 'M003', addr: '坪山河 K5+200', type: '水质异常', confidence: 0.78,
          gpsLat: null, gpsLng: null, gpsConfirmedAt: null, sitePhotos: [], siteNote: '' }
      ]
    },
    {
      id: 'WO-2026-0415-003', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0413-002', taskName: '布吉电力巡检任务',
      stationAddr: '布吉变电站 3号线', status: 'ASSIGNED',
      assigneeId: 'U003', assigneeName: '王五',
      dispatchNote: '需携带绝缘手套', dispatchedAt: '2026-04-13 14:00',
      viewedAt: null, submittedAt: null, createdAt: '2026-04-13 12:30',
      anomalyMedia: [
        { id: 'M004', addr: '布吉变电站 3号线', type: '设备异常', confidence: 0.83,
          gpsLat: null, gpsLng: null, gpsConfirmedAt: null, sitePhotos: [], siteNote: '' }
      ]
    },
    {
      id: 'WO-2026-0414-001', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0412-001', taskName: '龙岗G94巡检任务',
      stationAddr: '龙岗G94 K18+800', status: 'CLOSED',
      assigneeId: 'U002', assigneeName: '李四',
      dispatchNote: null, dispatchedAt: '2026-04-12 09:00',
      viewedAt: '2026-04-12 10:00', submittedAt: '2026-04-12 15:30',
      reviewedBy: 'U001', reviewedAt: '2026-04-13 09:00', closedAt: '2026-04-13 09:00',
      createdAt: '2026-04-12 08:00',
      anomalyMedia: [
        { id: 'M005', addr: '龙岗G94 K18+800', type: '路面破损', confidence: 0.88,
          gpsLat: 22.7145, gpsLng: 114.2321, gpsConfirmedAt: '2026-04-12 11:00',
          sitePhotos: ['photo5.jpg'], siteNote: '已核实并拍照记录' }
      ]
    },
    {
      id: 'WO-2026-0415-004', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0415-002', taskName: '坑梓片区巡检任务',
      stationAddr: '坑梓 K12+500', status: 'IN_PROGRESS',
      assigneeId: 'U002', assigneeName: '李四',
      dispatchNote: null, dispatchedAt: '2026-04-15 06:00',
      viewedAt: '2026-04-15 06:30', submittedAt: null, createdAt: '2026-04-15 05:30',
      anomalyMedia: [
        { id: 'M006', addr: '坑梓 K12+500', type: '管道渗漏', confidence: 0.79,
          gpsLat: null, gpsLng: null, gpsConfirmedAt: null, sitePhotos: [], siteNote: '' }
      ]
    },
    {
      id: 'WO-2026-0414-002', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0413-003', taskName: '横岗水库巡检',
      stationAddr: '横岗水库 西侧入口', status: 'REJECTED',
      assigneeId: 'U003', assigneeName: '王五',
      dispatchNote: null, dispatchedAt: '2026-04-13 10:00',
      viewedAt: '2026-04-13 11:00', submittedAt: '2026-04-14 09:00',
      rejectedAt: '2026-04-14 14:00', rejectNote: '现场照片角度不符合要求，请重新拍摄',
      createdAt: '2026-04-13 09:00',
      anomalyMedia: [
        { id: 'M007', addr: '横岗水库 西侧入口', type: '水质异常', confidence: 0.82,
          gpsLat: 22.7356, gpsLng: 114.2698, gpsConfirmedAt: '2026-04-13 12:00',
          sitePhotos: ['photo6.jpg'], siteNote: '' }
      ]
    },
    {
      id: 'WO-2026-0415-005', deptId: 'D001', dept: '龙岗区交通局',
      flightId: 'FL-2026-0415-003', taskName: '平湖片区巡检',
      stationAddr: '平湖 G107 K33+200', status: 'PENDING_REVIEW',
      assigneeId: 'U002', assigneeName: '李四',
      dispatchNote: null, dispatchedAt: '2026-04-15 07:30',
      viewedAt: '2026-04-15 08:00', submittedAt: '2026-04-15 13:00',
      createdAt: '2026-04-15 07:00',
      anomalyMedia: [
        { id: 'M008', addr: '平湖 G107 K33+200', type: '路面破损', confidence: 0.91,
          gpsLat: 22.6982, gpsLng: 114.3102, gpsConfirmedAt: '2026-04-15 09:30',
          sitePhotos: ['photo7.jpg', 'photo8.jpg'], siteNote: '龟裂严重，约20m²' }
      ]
    }
  ],

  flights: [
    {
      id: 'FL-2026-0415-001', taskId: 'T001', taskName: '龙岗G94巡检任务',
      deptId: 'D001', dept: '龙岗区交通局',
      scheduledAt: '2026-04-15 10:00', status: 'IN_PROGRESS', progress: 75,
      plannedRoute: [[114.240, 22.720], [114.245, 22.723], [114.250, 22.726], [114.255, 22.729]],
      actualRoute: [[114.240, 22.720], [114.243, 22.722], [114.246, 22.724]]
    },
    {
      id: 'FL-2026-0415-002', taskId: 'T002', taskName: '坑梓片区巡检任务',
      deptId: 'D001', dept: '龙岗区交通局',
      scheduledAt: '2026-04-15 14:00', status: 'PENDING', progress: null,
      plannedRoute: [[114.310, 22.698], [114.315, 22.701], [114.320, 22.704]],
      actualRoute: null
    },
    {
      id: 'FL-2026-0415-003', taskId: 'T003', taskName: '平湖片区巡检',
      deptId: 'D001', dept: '龙岗区交通局',
      scheduledAt: '2026-04-15 08:00', status: 'COMPLETED', progress: 100,
      plannedRoute: [[114.306, 22.696], [114.311, 22.699], [114.316, 22.702]],
      actualRoute: [[114.306, 22.696], [114.309, 22.698], [114.312, 22.700], [114.316, 22.702]]
    },
    {
      id: 'FL-2026-0414-001', taskId: 'T004', taskName: '横岗水库巡检',
      deptId: 'D001', dept: '龙岗区交通局',
      scheduledAt: '2026-04-14 09:00', status: 'COMPLETED', progress: 100,
      plannedRoute: [[114.267, 22.733], [114.271, 22.736]],
      actualRoute: [[114.267, 22.733], [114.270, 22.735], [114.271, 22.736]]
    }
  ],

  hazards: [
    {
      id: 'HAZ-2026-0415-001', reporterId: 'U002', reporterName: '李四',
      deptId: 'D001', dept: '龙岗区交通局',
      type: '路面损坏', photos: ['haz1.jpg'], gpsLat: 22.7231, gpsLng: 114.2456,
      description: '路面出现大面积龟裂，已影响车辆通行', status: 'ACTIVE',
      note: null, deletedAt: null, createdAt: '2026-04-15 10:30'
    },
    {
      id: 'HAZ-2026-0414-002', reporterId: 'U001', reporterName: '张三',
      deptId: 'D001', dept: '龙岗区交通局',
      type: '水质异常', photos: ['haz2.jpg', 'haz3.jpg'], gpsLat: 22.7356, gpsLng: 114.2698,
      description: '河道水体颜色异常，疑似污染', status: 'ACTIVE',
      note: '已上报环保部门跟进', deletedAt: null, createdAt: '2026-04-14 15:20'
    },
    {
      id: 'HAZ-2026-0413-003', reporterId: 'U003', reporterName: '王五',
      deptId: 'D001', dept: '龙岗区交通局',
      type: '管道渗漏', photos: ['haz4.jpg'], gpsLat: 22.6982, gpsLng: 114.3102,
      description: '地下管道渗漏，路面有积水痕迹', status: 'DELETED',
      note: '已核实非系统负责范围', deletedAt: '2026-04-14 10:00', createdAt: '2026-04-13 11:00'
    }
  ],

  requests: [
    {
      id: 'REQ-2026-0415-001', deptId: 'D001', dept: '龙岗区交通局',
      applicantId: 'U001', applicantName: '张三',
      stationId: 'S001', stationName: '龙岗G94 K22+400站点',
      taskDesc: '申请对龙岗G94高速K20-K25段进行专项道路巡检，重点关注路面破损和护栏情况',
      timeDesc: '2026年5月10日至5月12日，每日上午9:00-11:00',
      deliverableDesc: '提供高清航拍照片及AI识别报告，重点标注破损位置坐标',
      status: 'PROCESSING', acceptedAt: '2026-04-15 09:00',
      rejectedAt: null, rejectNote: null,
      linkedTaskId: null, resolvedDesc: null, resolvedAt: null,
      createdAt: '2026-04-15 08:30'
    },
    {
      id: 'REQ-2026-0414-001', deptId: 'D001', dept: '龙岗区交通局',
      applicantId: 'U001', applicantName: '张三',
      stationId: 'S002', stationName: '坪山河 K5+200站点',
      taskDesc: '申请对坪山河道进行水质监测专项巡检',
      timeDesc: '2026年4月20日上午',
      deliverableDesc: '提供河道全程视频及水质异常点坐标',
      status: 'SUBMITTED', acceptedAt: null,
      rejectedAt: null, rejectNote: null,
      linkedTaskId: null, resolvedDesc: null, resolvedAt: null,
      createdAt: '2026-04-14 16:00'
    },
    {
      id: 'REQ-2026-0410-001', deptId: 'D001', dept: '龙岗区交通局',
      applicantId: 'U001', applicantName: '张三',
      stationId: 'S003', stationName: '布吉变电站站点',
      taskDesc: '布吉变电站周边电力设施巡检',
      timeDesc: '2026年4月15日下午',
      deliverableDesc: '提供设备异常识别报告',
      status: 'RESOLVED', acceptedAt: '2026-04-10 10:00',
      rejectedAt: null, rejectNote: null,
      linkedTaskId: 'T005', resolvedDesc: '已安排飞行任务完成，任务编号T005',
      resolvedAt: '2026-04-14 17:00', createdAt: '2026-04-10 09:00'
    }
  ],

  stations: [
    { id: 'S001', name: '龙岗G94 K22+400站点' },
    { id: 'S002', name: '坪山河 K5+200站点' },
    { id: 'S003', name: '布吉变电站站点' },
    { id: 'S004', name: '横岗水库站点' },
    { id: 'S005', name: '平湖G107站点' }
  ],

  stats: {
    today: {
      flights: { total: 3, inProgress: 1, pending: 1, completed: 1 },
      results: { completed: 1, photos: 12, videos: 1, anomalies: 4 },
      workorders: { total: 5, pendingAssign: 1, assigned: 1, inProgress: 1, pendingReview: 2, rejected: 0, closed: 0 }
    },
    total: {
      flights: { total: 47, inProgress: 1, pending: 2, completed: 44 },
      results: { completed: 44, photos: 312, videos: 44, anomalies: 87 },
      workorders: { total: 73, pendingAssign: 2, assigned: 3, inProgress: 4, pendingReview: 8, rejected: 2, closed: 54 }
    }
  },

  statsExecutor: {
    today: {
      workorders: { pendingFollow: 1, inProgress: 1, pendingReview: 1, closed: 2 }
    },
    total: {
      workorders: { pendingFollow: 3, inProgress: 2, pendingReview: 1, closed: 12 }
    }
  }
};

// ─── 工具函数 ─────────────────────────────────────────────────
SIM.utils = {
  getStatusLabel(status) {
    const map = {
      PENDING_ASSIGN: '待指派', ASSIGNED: '已指派', IN_PROGRESS: '跟进中',
      PENDING_REVIEW: '待复核', REJECTED: '已打回', CLOSED: '已完成',
      SUBMITTED: '已提交', PROCESSING: '处理中', RESOLVED: '已完成',
      ACTIVE: 'ACTIVE', DELETED: 'DELETED', PENDING: '待执行', COMPLETED: '已完成'
    };
    return map[status] || status;
  },
  /** 架次 / 飞行任务口径：待执行、执行中、已完成（与工单 IN_PROGRESS→跟进中 区分） */
  getFlightStatusLabel(status) {
    const map = { PENDING: '待执行', IN_PROGRESS: '执行中', COMPLETED: '已完成' };
    return map[status] != null ? map[status] : String(status || '');
  },
  getStatusColor(status) {
    const map = {
      PENDING_ASSIGN: '#FA8C16', ASSIGNED: '#1677FF', IN_PROGRESS: '#1677FF',
      PENDING_REVIEW: '#722ED1', REJECTED: '#F5222D', CLOSED: '#52C41A',
      SUBMITTED: '#1677FF', PROCESSING: '#1677FF', RESOLVED: '#52C41A',
      ACTIVE: '#52C41A', DELETED: '#8C8C8C', PENDING: '#8C8C8C', COMPLETED: '#52C41A'
    };
    return map[status] || '#8C8C8C';
  },
  getStatusBg(status) {
    const map = {
      PENDING_ASSIGN: '#FFF7E6', ASSIGNED: '#E6F4FF', IN_PROGRESS: '#E6F4FF',
      PENDING_REVIEW: '#F9F0FF', REJECTED: '#FFF1F0', CLOSED: '#F6FFED',
      SUBMITTED: '#E6F4FF', PROCESSING: '#E6F4FF', RESOLVED: '#F6FFED',
      ACTIVE: '#F6FFED', DELETED: '#F5F5F5', PENDING: '#F5F5F5', COMPLETED: '#F6FFED'
    };
    return map[status] || '#F5F5F5';
  },
  formatDate(str) {
    if (!str) return '—';
    return str.replace('T', ' ').substring(0, 16);
  },
  getUserById(id) {
    return SIM.data.users.find(u => u.id === id) || null;
  },
  getWOById(id) {
    return SIM.data.workorders.find(w => w.id === id) || null;
  },
  getFlightById(id) {
    return SIM.data.flights.find(f => f.id === id) || null;
  },
  getHazardById(id) {
    return SIM.data.hazards.find(h => h.id === id) || null;
  },
  getRequestById(id) {
    return SIM.data.requests.find(r => r.id === id) || null;
  },
  getExecutorsByDept(deptId) {
    return SIM.data.users.filter(u => u.deptId === deptId && u.role === 'EXECUTOR' && u.status === 'ACTIVE');
  },
  toast(msg, duration = 2000) {
    const el = document.createElement('div');
    el.className = 'sim-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('show'); }, 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, duration);
  }
};

// ─── Tooltip & Toast 全局样式注入 ────────────────────────────
SIM.injectStyles = function() {
  if (document.getElementById('sim-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'sim-global-styles';
  style.textContent = `
    /* Tooltip */
    [data-field] { position: relative; cursor: default; }
    [data-field]:hover .ft { display: block; }
    .ft {
      display: none; position: absolute; left: 0; top: calc(100% + 6px);
      z-index: 9999; background: #1a1a1a; color: #eee; border-radius: 6px;
      padding: 10px 12px; font-size: 12px; line-height: 1.8; white-space: nowrap;
      pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.25); min-width: 200px;
    }
    .ft-key { color: #aaa; display: inline-block; width: 48px; }
    .ft-mono { font-family: monospace; color: #7dd3fc; }
    body.hide-tooltip [data-field]:hover .ft { display: none; }

    /* Toast */
    .sim-toast {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(0,0,0,0.75); color: #fff; padding: 8px 20px;
      border-radius: 20px; font-size: 14px; z-index: 99999;
      opacity: 0; transition: all 0.3s ease; pointer-events: none;
    }
    .sim-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* Modal overlay */
    .sim-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      z-index: 9000; display: flex; align-items: center; justify-content: center;
    }
    .sim-modal {
      background: #fff; border-radius: 8px; padding: 24px 20px;
      width: 300px; max-width: 90vw;
    }
    .sim-modal h3 { margin: 0 0 12px; font-size: 16px; color: #000000d9; }
    .sim-modal p { margin: 0 0 20px; font-size: 14px; color: #00000073; line-height: 1.6; }
    .sim-modal .modal-btns { display: flex; gap: 8px; justify-content: flex-end; }
    .sim-modal .btn-cancel {
      padding: 6px 16px; border: 1px solid #d9d9d9; background: #fff;
      border-radius: 4px; cursor: pointer; font-size: 14px; color: #595959;
    }
    .sim-modal .btn-confirm {
      padding: 6px 16px; background: #1677FF; color: #fff;
      border: none; border-radius: 4px; cursor: pointer; font-size: 14px;
    }
    .sim-modal .btn-danger {
      padding: 6px 16px; background: #F5222D; color: #fff;
      border: none; border-radius: 4px; cursor: pointer; font-size: 14px;
    }

    /* Empty state */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 24px; color: #8C8C8C;
    }
    .empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state p { font-size: 14px; margin: 0; }

    /* Loading */
    .loading-state {
      display: flex; justify-content: center; align-items: center;
      padding: 32px; color: #1677FF; font-size: 14px; gap: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  `;
  document.head.appendChild(style);
};

/** PC 端（本期页面）视觉壳：浅蓝渐变底、侧栏、顶栏天气/标题/时钟 — 仅样式，不接真实数据 */
SIM.pcShellThemeCSS = `
html.pc-route {
  --pc-blue: #1677FF;
}
html.pc-route body {
  margin: 0;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(165deg, #e3f0fb 0%, #f2f7fc 42%, #dde9f5 100%);
  color: #262626;
  -webkit-font-smoothing: antialiased;
}
html.pc-route body.pc-login-only {
  display: flex;
  flex-direction: column;
}
.pc-app { display: flex; min-height: 100vh; }
.pc-sidenav {
  width: 220px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #ffffff 0%, #f5faff 100%);
  border-right: 1px solid rgba(22,119,255,0.1);
  box-shadow: 4px 0 20px rgba(15, 60, 120, 0.06);
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}
.pc-sidenav-brand {
  padding: 0 20px 18px;
  margin: 0 12px 12px;
  font-size: 15px;
  font-weight: 700;
  color: #1677FF;
  border-bottom: 1px solid rgba(22,119,255,0.12);
  letter-spacing: 0.5px;
}
.pc-sidenav-item {
  display: flex;
  align-items: center;
  padding: 11px 16px;
  margin: 2px 12px;
  border-radius: 8px;
  color: #434343;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}
.pc-sidenav-item:hover {
  background: rgba(22,119,255,0.07);
  color: #1677FF;
}
.pc-sidenav-item.active {
  background: #1677FF;
  color: #fff;
  box-shadow: 0 4px 12px rgba(22,119,255,0.35);
}
.pc-sidenav-muted-title {
  padding: 12px 20px 6px;
  margin-top: 8px;
  font-size: 11px;
  color: #8C8C8C;
  letter-spacing: 0.5px;
  border-top: 1px dashed rgba(22,119,255,0.15);
}
.pc-sidenav-item.pc-sidenav-disabled {
  color: #BFBFBF !important;
  cursor: not-allowed !important;
  pointer-events: none;
  background: transparent !important;
  box-shadow: none !important;
  user-select: none;
}
.pc-frame {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pc-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 0 16px;
  height: 50px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #0a2347 0%, #143a65 45%, #0a2347 100%);
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: relative;
  z-index: 50;
}
.pc-topbar-weather {
  font-size: 11px;
  color: rgba(255,255,255,0.72);
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  max-width: 42%;
}
@media (max-width: 1100px) {
  .pc-topbar-weather .pc-w-extra { display: none; }
}
.pc-topbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  white-space: nowrap;
}
.pc-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}
.pc-btn-screen {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.22);
  color: rgba(255,255,255,0.95);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: default;
  font-size: 12px;
}
.pc-clock {
  color: rgba(255,255,255,0.88);
  font-variant-numeric: tabular-nums;
  min-width: 170px;
  text-align: right;
}
.pc-user-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(145deg, #7eb8ff, #1677FF);
  flex-shrink: 0;
}
.pc-main-inner {
  flex: 1;
  padding: 20px 24px 28px;
  overflow: auto;
}
.pc-subbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(22,119,255,0.08);
  flex-shrink: 0;
}
.pc-subbar .pc-back {
  color: #1677FF;
  font-size: 13px;
  text-decoration: none;
}
.pc-subbar .pc-back:hover { text-decoration: underline; }
.pc-breadcrumb-muted { color: #8C8C8C; font-size: 13px; }
html.pc-route .pc-card {
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(22, 90, 160, 0.08);
  border: 1px solid rgba(22, 119, 255, 0.06);
}
html.pc-route .pool-content {
  border-radius: 0 0 10px 10px;
  box-shadow: 0 4px 24px rgba(22, 90, 160, 0.08);
  border: 1px solid rgba(22, 119, 255, 0.06);
  border-top: none;
}
html.pc-route .main-tabs {
  border-radius: 10px 10px 0 0;
  border: 1px solid rgba(22, 119, 255, 0.06);
  border-bottom: 2px solid #f0f0f0;
}
html.pc-route .header-actions { color: rgba(255,255,255,0.82); }
html.pc-route .header-sep { color: rgba(255,255,255,0.35); }
html.pc-route .header-logout {
  background: none;
  border: none;
  color: rgba(255,255,255,0.78);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
html.pc-route .header-logout:hover { color: #fff; }
html.pc-route body.pc-login-only .pc-login-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}
html.pc-route .wo-card {
  border-radius: 10px;
  border: 1px solid rgba(22, 119, 255, 0.07);
  box-shadow: 0 4px 18px rgba(22, 90, 140, 0.07);
}
`;

SIM.injectPcShellTheme = function() {
  const p = (window.location.pathname || '').replace(/\\/g, '/');
  if (p.indexOf('/pc/') === -1) return;
  if (document.getElementById('pc-shell-theme')) return;
  document.documentElement.classList.add('pc-route');
  const st = document.createElement('style');
  st.id = 'pc-shell-theme';
  st.textContent = SIM.pcShellThemeCSS;
  document.head.appendChild(st);
};

SIM.initPcClock = function() {
  const el = document.getElementById('pc-clock');
  if (!el) return;
  function tick() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    el.textContent = y + '年' + m + '月' + day + '日 ' + h + ':' + min + ':' + s;
  }
  tick();
  setInterval(tick, 1000);
};

// ─── 确认弹窗 ─────────────────────────────────────────────────
SIM.confirm = function({ title, content, confirmText = '确认', confirmClass = 'btn-confirm', onConfirm, onCancel } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'sim-modal-overlay';
  overlay.innerHTML = `
    <div class="sim-modal">
      <h3>${title}</h3>
      <p>${content}</p>
      <div class="modal-btns">
        <button class="btn-cancel" id="modal-cancel">取消</button>
        <button class="${confirmClass}" id="modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').onclick = () => { overlay.remove(); onCancel && onCancel(); };
  overlay.querySelector('#modal-confirm').onclick = () => { overlay.remove(); onConfirm && onConfirm(); };
};

// ─── SimulationPanel 基础构造器 ──────────────────────────────
SIM.createPanel = function(config = {}) {
  const { items = [], onRoleChange, hideRoleSwitch = false, loginDevJump } = config;
  const _isPC = window.location.pathname.includes('/pc/');

  const oldPanel = document.getElementById('sim-panel');
  if (oldPanel) oldPanel.remove();
  const oldStyle = document.getElementById('sim-panel-styles');
  if (oldStyle) oldStyle.remove();

  const panel = document.createElement('div');
  panel.id = 'sim-panel';
  panel.innerHTML = `
    <button id="sim-toggle" title="仿真控制台">⚙</button>
    <div id="sim-content" style="display:none">
      <div class="sim-panel-header">
        <span>仿真控制台</span>
        <button id="sim-close">×</button>
      </div>
      <div class="sim-panel-body">
        ${hideRoleSwitch ? '' : (_isPC ? `
        <div class="sim-section">
          <label class="sim-label">角色</label>
          <div class="sim-role-btns">
            <button class="sim-role-btn ${SIM.session && SIM.session.role === 'OPERATOR' ? 'active' : ''}" data-role="OPERATOR">运营人员</button>
            <button class="sim-role-btn ${SIM.session && SIM.session.role === 'OBSERVER' ? 'active' : ''}" data-role="OBSERVER">观察员</button>
          </div>
        </div>` : `
        <div class="sim-section">
          <label class="sim-label">角色</label>
          <div class="sim-role-btns">
            <button class="sim-role-btn ${SIM.session && SIM.session.role === 'ADMIN' ? 'active' : ''}" data-role="ADMIN">管理员</button>
            <button class="sim-role-btn ${SIM.session && SIM.session.role === 'EXECUTOR' ? 'active' : ''}" data-role="EXECUTOR">执行人员</button>
          </div>
        </div>`)}
        <div class="sim-section">
          <label class="sim-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
            字段注释
            <input type="checkbox" id="tooltip-toggle" ${!document.body.classList.contains('hide-tooltip') ? 'checked' : ''}>
          </label>
        </div>
        ${loginDevJump === 'to-h5' ? `
        <div class="sim-section">
          <button type="button" class="sim-btn" id="sim-jump-h5-login">跳转至H5登录页</button>
        </div>` : ''}
        ${loginDevJump === 'to-pc' ? `
        <div class="sim-section">
          <button type="button" class="sim-btn" id="sim-jump-pc-login">跳转至PC登录页</button>
        </div>` : ''}
        ${items.map(item => `
          <div class="sim-section">
            <label class="sim-label">${item.label}</label>
            ${item.html}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #sim-panel { position: fixed; bottom: 80px; right: 16px; z-index: 8000; }
    #sim-toggle {
      width: 44px; height: 44px; border-radius: 50%; background: #1677FF;
      color: #fff; border: none; cursor: pointer; font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;
    }
    #sim-content {
      position: absolute; bottom: 54px; right: 0; width: 260px;
      background: #fff; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .sim-panel-header {
      background: #1677FF; color: #fff; padding: 10px 14px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px; font-weight: 600;
    }
    #sim-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 0; }
    .sim-panel-body { padding: 12px; max-height: 60vh; overflow-y: auto; }
    .sim-section { margin-bottom: 12px; }
    .sim-label { font-size: 12px; color: #8C8C8C; margin-bottom: 6px; display: block; }
    .sim-role-btns { display: flex; gap: 6px; }
    .sim-role-btn {
      flex: 1; padding: 5px 0; border: 1px solid #d9d9d9; background: #fff;
      border-radius: 4px; font-size: 12px; cursor: pointer; color: #595959;
      transition: all 0.2s;
    }
    .sim-role-btn.active { background: #1677FF; color: #fff; border-color: #1677FF; }
    .sim-btn {
      width: 100%; padding: 7px; background: #f0f5ff; color: #1677FF;
      border: 1px solid #ADC6FF; border-radius: 4px; font-size: 12px;
      cursor: pointer; margin-bottom: 6px; text-align: center;
    }
    .sim-btn:hover { background: #1677FF; color: #fff; }
    .sim-select {
      width: 100%; padding: 5px 8px; border: 1px solid #d9d9d9;
      border-radius: 4px; font-size: 12px; color: #262626; background: #fff;
    }
    #sim-panel input[type=checkbox] { cursor: pointer; }
  `;
  style.id = 'sim-panel-styles';
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const simContent = panel.querySelector('#sim-content');
  panel.querySelector('#sim-toggle').onclick = () => {
    if (!simContent) return;
    simContent.style.display = simContent.style.display === 'none' ? 'block' : 'none';
  };
  panel.querySelector('#sim-close').onclick = () => {
    if (simContent) simContent.style.display = 'none';
  };

  const tt = panel.querySelector('#tooltip-toggle');
  if (tt) {
    tt.onchange = function() {
      document.body.classList.toggle('hide-tooltip', !this.checked);
    };
  }

  if (!hideRoleSwitch) {
    panel.querySelectorAll('.sim-role-btn').forEach(btn => {
      btn.onclick = function() {
        const role = this.dataset.role;
        if (_isPC) {
          // PC端：OPERATOR / OBSERVER
          if (role === 'OBSERVER') {
            SIM.session = { role: 'OBSERVER', scopeDeptId: 'D001',
              user: { id: 'OB001', name: '钱观察', deptId: 'D001', dept: '龙岗区交通局' } };
          } else {
            SIM.session = { role: 'OPERATOR',
              user: { id: 'OP001', name: '王运营', deptId: null, dept: '市运营中心' } };
          }
          SIM.saveSession();
          panel.querySelectorAll('.sim-role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
          onRoleChange && onRoleChange(role);
          window.location.reload();
        } else {
          // H5端：ADMIN / EXECUTOR
          if (!SIM.session) {
            SIM.session = {
              role,
              user: { id: role === 'ADMIN' ? 'U001' : 'U002', name: role === 'ADMIN' ? '张三' : '李四', deptId: 'D001', dept: '龙岗区交通局' }
            };
          } else {
            SIM.session.role = role;
            if (!SIM.session.user) SIM.session.user = { id: '', name: '', deptId: 'D001', dept: '龙岗区交通局' };
            SIM.session.user.name = role === 'ADMIN' ? '张三' : '李四';
            SIM.session.user.id = role === 'ADMIN' ? 'U001' : 'U002';
          }
          SIM.saveSession();
          panel.querySelectorAll('.sim-role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
          onRoleChange && onRoleChange(role);
          window.location.replace(SIM.getSimHomeHref());
        }
      };
    });
  }

  const jumpH5 = panel.querySelector('#sim-jump-h5-login');
  if (jumpH5) jumpH5.onclick = () => { window.location.href = '../h5/login.html'; };
  const jumpPc = panel.querySelector('#sim-jump-pc-login');
  if (jumpPc) jumpPc.onclick = () => { window.location.href = '../pc/login.html'; };

  if (_isPC) SIM.bindPcHeaderUser();

  return panel;
};

// ─── Tooltip 构建器 ──────────────────────────────────────────
SIM.tooltip = function(displayVal, { name, type, source, desc }) {
  return `<span data-field>${displayVal}<div class="ft">
    <div><span class="ft-key">字段名</span><span class="ft-mono">${name}</span></div>
    <div><span class="ft-key">类型</span>${type}</div>
    <div><span class="ft-key">来源</span>${source}</div>
    <div><span class="ft-key">说明</span>${desc}</div>
  </div></span>`;
};

// ─── H5 底部导航栏 ───────────────────────────────────────────
/** PRD §1.3：交通局侧执行人员无 H5 任务监控，不展示「任务」Tab */
SIM.renderBottomNav = function(active) {
  const session = SIM.session || JSON.parse(localStorage.getItem('ywsf_session') || 'null');
  const role = session && session.role;
  const tabs = [
    { id: 'home', label: '首页', icon: '🏠', href: 'home.html' },
    { id: 'workorder', label: '工单', icon: '📋', href: 'workorder.html' },
    ...(role === 'EXECUTOR' ? [] : [{ id: 'task', label: '任务', icon: '🚁', href: 'task.html' }]),
    { id: 'mine', label: '我的', icon: '👤', href: 'mine.html' }
  ];
  return `
    <nav class="bottom-nav">
      ${tabs.map(t => `
        <a class="nav-item ${active === t.id ? 'active' : ''}" href="${t.href}">
          <span class="nav-icon">${t.icon}</span>
          <span class="nav-label">${t.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
};

SIM.bottomNavStyles = `
  .bottom-nav {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 390px; background: #fff;
    border-top: 1px solid #F0F0F0; display: flex;
    z-index: 1000; padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    padding: 8px 0 6px; text-decoration: none; color: #8C8C8C; font-size: 10px;
    transition: color 0.2s;
  }
  .nav-item.active { color: #1677FF; }
  .nav-icon { font-size: 20px; line-height: 1; margin-bottom: 2px; }
  .nav-label { font-size: 10px; }
  .page-content { padding-bottom: 64px; }
`;

// ─── H5 顶部导航栏 ───────────────────────────────────────────
SIM.renderTopBar = function({ title, showBack = true, right = '' }) {
  return `
    <header class="top-bar">
      ${showBack ? `<button class="back-btn" onclick="SIM.nav.back()">‹</button>` : '<div class="back-placeholder"></div>'}
      <h1 class="top-title">${title}</h1>
      <div class="top-right">${right}</div>
    </header>
  `;
};

SIM.topBarStyles = `
  .top-bar {
    position: sticky; top: 0; z-index: 100; background: #fff;
    border-bottom: 1px solid #F0F0F0; display: flex; align-items: center;
    padding: 0 16px; height: 48px; max-width: 390px; margin: 0 auto;
    width: 100%;
  }
  .back-btn {
    background: none; border: none; font-size: 24px; color: #262626;
    cursor: pointer; padding: 0; width: 32px; line-height: 1;
  }
  .back-placeholder { width: 32px; }
  .top-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #262626; margin: 0; }
  .top-right { width: 32px; text-align: right; }
`;

// ─── H5 基础页面样式 ─────────────────────────────────────────
SIM.baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #F5F5F5; color: #262626; font-size: 14px;
    max-width: 390px; margin: 0 auto; min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    background: #fff; border-radius: 8px; margin: 8px; padding: 12px 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .btn-primary {
    background: #1677FF; color: #fff; border: none; border-radius: 4px;
    padding: 10px 20px; font-size: 15px; cursor: pointer; width: 100%;
    font-weight: 500; transition: opacity 0.2s;
  }
  .btn-primary:disabled { background: #D9D9D9; color: #BFBFBF; cursor: not-allowed; }
  .btn-primary:not(:disabled):active { opacity: 0.8; }
  .btn-default {
    background: #fff; color: #595959; border: 1px solid #D9D9D9; border-radius: 4px;
    padding: 10px 20px; font-size: 15px; cursor: pointer; width: 100%; font-weight: 500;
  }
  .btn-danger { background: #F5222D; color: #fff; border: none; border-radius: 4px;
    padding: 10px 20px; font-size: 15px; cursor: pointer; width: 100%; font-weight: 500;
  }
  .status-tag {
    display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
  }
  .field-row { display: flex; padding: 8px 0; border-bottom: 1px solid #F0F0F0; align-items: flex-start; }
  .field-row:last-child { border-bottom: none; }
  .field-label { color: #8C8C8C; font-size: 13px; min-width: 72px; padding-top: 1px; }
  .field-value { color: #262626; font-size: 13px; flex: 1; word-break: break-all; }
  .section-title { font-size: 15px; font-weight: 600; color: #262626; margin-bottom: 12px; }
  input[type=text], input[type=password], textarea, select {
    width: 100%; padding: 9px 12px; border: 1px solid #D9D9D9; border-radius: 4px;
    font-size: 14px; color: #262626; outline: none; background: #fff;
    font-family: inherit;
  }
  input:focus, textarea:focus, select:focus { border-color: #1677FF; }
  textarea { resize: vertical; min-height: 80px; }
  .form-item { margin-bottom: 16px; }
  .form-label { font-size: 13px; color: #595959; margin-bottom: 6px; display: flex; justify-content: space-between; }
  .form-label .required { color: #F5222D; margin-left: 2px; }
  .char-count { color: #BFBFBF; font-size: 12px; }
  .divider { height: 8px; background: #F5F5F5; margin: 0 -16px; }
`;

// ─── PC 基础样式 ─────────────────────────────────────────────
SIM.pcBaseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #F0F2F5; color: #262626; font-size: 14px;
    -webkit-font-smoothing: antialiased; min-height: 100vh;
  }
  .pc-layout { display: flex; flex-direction: column; min-height: 100vh; }
  .pc-header {
    background: #001529; color: #fff; height: 56px;
    display: flex; align-items: center; padding: 0 24px; gap: 16px;
    position: sticky; top: 0; z-index: 100;
  }
  .pc-header .logo { font-size: 18px; font-weight: 700; color: #fff; margin-right: 8px; }
  .pc-header .back-link { color: #ffffffa0; font-size: 13px; cursor: pointer; text-decoration: none; }
  .pc-header .back-link:hover { color: #fff; }
  .pc-main { flex: 1; padding: 24px; }
  .pc-card {
    background: #fff; border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08); overflow: hidden;
  }
  .pc-card-header {
    padding: 16px 20px; border-bottom: 1px solid #F0F0F0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .pc-card-title { font-size: 16px; font-weight: 600; color: #262626; }
  .pc-card-body { padding: 16px 20px; }
  .btn-primary {
    background: #1677FF; color: #fff; border: none; border-radius: 4px;
    padding: 7px 16px; font-size: 14px; cursor: pointer; font-weight: 500;
    transition: opacity 0.2s; white-space: nowrap;
  }
  .btn-primary:hover { opacity: 0.85; }
  .btn-default {
    background: #fff; color: #595959; border: 1px solid #D9D9D9; border-radius: 4px;
    padding: 7px 16px; font-size: 14px; cursor: pointer; white-space: nowrap;
  }
  .btn-default:hover { border-color: #1677FF; color: #1677FF; }
  .btn-danger { background: #F5222D; color: #fff; border: none; border-radius: 4px;
    padding: 7px 16px; font-size: 14px; cursor: pointer; white-space: nowrap;
  }
  .status-tag {
    display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
  }
  input[type=text], input[type=password], textarea, select {
    padding: 6px 10px; border: 1px solid #D9D9D9; border-radius: 4px;
    font-size: 14px; color: #262626; outline: none; background: #fff; font-family: inherit;
  }
  input:focus, textarea:focus, select:focus { border-color: #1677FF; }
`;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  SIM.injectStyles();
  SIM.injectPcShellTheme();
  SIM.initPcClock();
});
