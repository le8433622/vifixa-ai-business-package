// AI Types v2 — Shared type definitions cho toàn bộ hệ thống Vifixa AI
// 100% tiếng Việt comments, consistent patterns cho mọi agent

// ====== KIẾN TRÚC ======

/** Các bậc model AI — từ rẻ đến thông minh nhất */
export type BacModel = 're' | 'trung_binh' | 'thong_minh' | 'thi_giac'

/** Cấu hình một bậc model */
export interface CauHinhModel {
  model: string
  tokensToiDa: number
  chiPhi1KIn: number
  chiPhi1KOut: number
  coThiGiac: boolean
}

/** Ánh xạ agent → bậc model */
export type AgentModelMap = Record<string, BacModel>

/** Kết quả trả về từ AI */
export type KetQuaAI<T> = {
  thanhCong: true
  duLieu: T
  meta: {
    model: string
    doTre: number
    tokensIn: number
    tokensOut: number
    chiPhi: number
    cacheHit: boolean
    phienBanPrompt: number
    phienBanAB?: string
  }
} | {
  thanhCong: false
  loi: string
  meta: { model: string; doTre: number; cacheHit: false; phienBanAB?: string }
}

// ====== AGENT: CHẨN ĐOÁN ======

export interface DauVaoChanDoan {
  danhMuc: string
  moTa: string
  urlsMedia?: string[]
  viTri?: { viDo: number; kinhDo: number }
}

export interface DauRaChanDoan {
  chanDoan: string
  mucDo: 'thap' | 'trung_binh' | 'cao' | 'khan_cap'
  kyNangDeXuat: string[]
  khoangGiaUocTinh?: { toiThieu: number; toiDa: number }
  doTinCay: number
  cauHoiThem?: string[]
}

// ====== AGENT: ĐỊNH GIÁ ======

export interface DauVaoDinhGia {
  danhMuc: string
  chanDoan: string
  viTri: { viDo: number; kinhDo: number }
  mucDo: 'thap' | 'trung_binh' | 'cao' | 'khan_cap'
  heSoNhan?: Record<string, number>
}

export interface DauRaDinhGia {
  giaUocTinh: number
  giaCoSo: number
  heSoTang: number
  bacTang: string
  chiTietGia: { hangMuc: string; chiPhi: number }[]
  doTinCay: number
  giaTrungBinhLichSu?: number
}

// ====== AGENT: GHÉP THỢ ======

export interface DauVaoGhepTho {
  maDon: string
  kyNangYeuCau: string[]
  viTri: { viDo: number; kinhDo: number }
  mucDo: string
}

export interface DauRaGhepTho {
  maThoDuocChon: string
  tenTho: string
  etaPhut: number
  doTinCay: number
  lyDoChon?: string[]
  danhSachThayThe?: { ma: string; ten: string; diem: number }[]
}

// ====== AGENT: KIỂM TRA CHẤT LƯỢNG ======

export interface DauVaoKiemTraChatLuong {
  maDon: string
  maTho: string
  mediaTruoc?: string[]
  mediaSau?: string[]
  danhSachKiemTra?: Record<string, boolean>
}

export interface DauRaKiemTraChatLuong {
  diemChatLuong: number
  dat: boolean
  vanDe: string[]
  khuyenNghi: string[]
  phanTichThiGiac?: {
    tayNghe: number
    veSinh: number
    hoanThanh: number
    soSanh: string
  }
}

// ====== AGENT: XỬ LÝ TRANH CHẤP ======

export interface DauVaoTranhChap {
  maDon: string
  maNguoiKhieuNai: string
  loaiKhieuNai: 'chat_luong' | 'gia_ca' | 'dung_gio' | 'hu_hai'
  moTa: string
  urlsBangChung?: string[]
}

export interface DauRaTranhChap {
  tomTat: string
  mucDo: 'thap' | 'trung_binh' | 'cao'
  hanhDongDeXuat: 'hoan_tien' | 'lam_lai' | 'hoan_tien_mot_phan' | 'bo_qua'
  doTinCay: number
  giaiThich: string
  canNguoiXemXet?: boolean
}

// ====== AGENT: HUẤN LUYỆN THỢ ======

export interface DauRaHuanLuyen {
  goiY: string[]
  meoAnToan: string[]
  kyNangDeXuat: string[]
  meoTangThuNhap: string[]
}

// ====== AGENT: PHÁT HIỆN GIAN LẬN ======

export interface DauRaGianLan {
  diemRuiRo: number
  canhBao: { loai: string; mucDo: string; moTa: string; bangChung: any }[]
  khuyenNghi: string
}

// ====== AGENT: DỰ ĐOÁN BẢO TRÌ ======

export interface DauRaDuDoanBaoTri {
  ngayBaoTriTiepTheo: string
  loaiBaoTri: string
  mucDo: 'thap' | 'trung_binh' | 'cao'
  chiPhiUocTinh?: number
  khuyenNghi: string[]
  tuoiThoThietBi?: number
}

// ====== AGENT: CHĂM SÓC ======

export interface DauRaChamSoc {
  tomTat: string
  hanhDongTiepTheo: { tieuDe: string; moTa: string; loaiHanhDong: string }
  insightsThietBi: { loai: string; tuoiThang: number; canChuY: boolean; khuyenNghi: string }[]
  nhacNhoBaoTri: { tieuDe: string; han: string; uuTien: string }[]
  goiYDatLai: { danhMuc: string; lyDo: string }[]
  trangThaiTrungThanh: { bac: string; tongChi: number; mucTiepTheo: number }
}

// ====== AGENT: BẢO HÀNH ======

export interface DauRaBaoHanh {
  duDieuKien: boolean
  soNgayConLai: number
  tuDongDuyet: boolean
  khuyenNghi: string
  thongBao: string
}

// ====== AGENT: UPSELL ======

export interface DauRaUpsell {
  goiY: string
  loaiSanPham: 'membership' | 'bao_hanh' | 'tho_cao_cap' | 'vat_tu' | 'bao_tri' | 'goi_noi_bat'
  phanTramGiam?: number
  doTinCay: number
  lyDo: string
}

// ====== CHAT ======

export interface DauVaoChat {
  sessionId?: string
  tinNhan: string
  nguCanh?: Record<string, unknown>
  stream?: boolean
}

export interface DauRaChat {
  sessionId: string
  traLoi: string
  trangThai: string
  hanhDong: { loai: string; nhan?: string; giaTri?: string; duLieu?: unknown }[]
  upsell?: {
    goiY?: string
    loaiSanPham?: string
    phanTramGiam?: number
    hienThi: boolean
  }
  sessionHoanThanh: boolean
  maDon?: string
}

// ====== TÌM KIẾM VECTOR ======

export interface KetQuaTimKiem {
  ma: string
  loai: string
  vanBan: string
  metadata: Record<string, unknown>
  doTuongDong: number
}

// ====== AUTO-PILOT ======

export interface KetQuaTuDong {
  maYeuCau: string
  thoiGianBatDau: string
  thoiGianKetThuc?: string
  chanDoan?: DauRaChanDoan
  dinhGia?: DauRaDinhGia
  ghepTho?: DauRaGhepTho
  daTaoDon?: { maDon: string; trangThai: string }
  upsell?: DauRaUpsell
  loi?: string[]
  cheDo?: string
}

// ====== PHÂN TÍCH ======

export interface TongQuanAI {
  chiPhiHomNay: number
  tongDoanhThu: number
  doChinhXacTB: number
  tongDon: number
  tongKhachHang: number
  tongTho: number
  ROI: string
}

export interface PhanTichChurn {
  tyLeChurn: number
  soLuongRuiRo: number
  insightsAI: {
    khuyenNghi: string[]
    chienLuocGiutChan: { hanhDong: string; tacDong: string }[]
  } | null
}