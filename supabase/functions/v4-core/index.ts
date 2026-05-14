// 🧠 V4 Core — AI Engine Infrastructure
// Shared types + utilities cho 4 super-agents

import { z } from 'https://esm.sh/zod@3.22.4'

// === KIẾN TRÚC ===

/** Mức độ ưu tiên xử lý */
export type MucUuTien = 'thap' | 'trung_binh' | 'cao' | 'khan_cap'

/** Kết quả xử lý */
export type KetQua<T> = {
  thanhCong: true
  duLieu: T
  meta: {
    model: string
    thoiGian: number
    chiPhi: number
    cacheHit: boolean
    giaiThich?: string
  }
} | {
  thanhCong: false
  loi: string
  meta: { model: string; thoiGian: number; chiPhi: number; cacheHit: false }
}

// === ĐỊA LÝ ===

/** Tọa độ */
export interface ToaDo {
  viDo: number
  kinhDo: number
}

// === LUỒNG ===

/** Một bước trong luồng xử lý */
export interface BuocXuLy {
  ten: string            // Tên bước
  moTa: string           // Mô tả
  trangThai: 'cho' | 'dang_xu_ly' | 'thanh_cong' | 'that_bai'
  ketQua?: unknown       // Kết quả bước
  loi?: string            // Lỗi nếu có
}

// === CUỘC HỘI THOẠI ===

/** Tin nhắn hội thoại */
export interface TinNhan {
  vaiTro: 'nguoi_dung' | 'tro_ly' | 'he_thong'
  noiDung: string
  thoiGian?: string
  dinhKem?: unknown[]
}

// === ĐƠN HÀNG ===

export interface DonHang {
  id?: string
  danhMuc: string
  moTa: string
  viTri: ToaDo
  mucDo: MucUuTien
  thoiGianMongMuon?: string
  urlsMedia?: string[]
  khachHangId: string
}

// === 4 SUPER-AGENT TYPES ===

/** Đầu vào Orchestrator */
export interface DauVaoOrchestrator {
  hanhDong: 'nhan_don' | 'xu_ly_chat' | 'phan_tich' | 'quyet_dinh'
  noiDung: string
  nguCanh?: Record<string, unknown>
}

/** Đầu ra Orchestrator */
export interface DauRaOrchestrator {
  yDinh: string
  cacBuoc: BuocXuLy[]
  ketQuaCuoi?: unknown
  loi?: string[]
}

/** Đầu vào Navigator */
export interface DauVaoNavigator {
  hanhDong: 'tim_gan_day' | 'tinh_duong_di' | 'nhiet_do' | 'kiem_tra_vung' | 'du_doan_nhu_cau' | 'de_xuat_khu_vuc'
  viTri: ToaDo
  banKinh?: number
  danhMuc?: string
}

/** Đầu ra Navigator */
export interface DauRaNavigator {
  danhSach: Array<{
    id: string
    ten: string
    khoangCachKm: number
    thoiGianPhut: number
    diemDanhGia?: number
    kyNang?: string[]
  }>
  tongSo: number
}

/** Đầu vào Monetizer */
export interface DauVaoMonetizer {
  hanhDong: 'dinh_gia' | 'upsell' | 'thuong_luong' | 'phan_tich_doanh_thu'
  danhMuc: string
  giaTri?: number
  nguCanh?: Record<string, unknown>
}

/** Đầu ra Monetizer */
export interface DauRaMonetizer {
  deXuat: string
  gia?: number
  mucGiam?: number
  doTinCay: number
  lyDo: string
  coHoi?: Array<{ ten: string; giaTri: number }>
}

/** Đầu vào Humanizer */
export interface DauVaoHumanizer {
  hanhDong: 'tra_loi' | 'chan_doan' | 'huan_luyen' | 'hoa_giai'
  tinNhan: string
  lichSu: TinNhan[]
  nguCanh?: Record<string, unknown>
}

/** Đầu ra Humanizer */
export interface DauRaHumanizer {
  traLoi: string
  hanhDong?: Array<{ loai: string; data: unknown }>
  doTinCay?: number
  phiien?: unknown
}

// === Zod Schemas cho validation ===
export const ToaDoSchema = z.object({ viDo: z.number().min(-90).max(90), kinhDo: z.number().min(-180).max(180) })
export const DonHangSchema = z.object({ danhMuc: z.string().min(1), moTa: z.string().min(5), viTri: ToaDoSchema, khachHangId: z.string().uuid() })

// === COST ESTIMATION ===
export const CHI_PHI_MODEL = {
  co_ban: { model: 'meta/llama-3.1-8b-instruct', chiPhi1K: 0.0001 },
  thong_minh: { model: 'meta/llama-3.1-70b-instruct', chiPhi1K: 0.002 },
  thi_giac: { model: 'meta/llama-3.2-11b-vision-instruct', chiPhi1K: 0.001 },
} as const

export function uocTinhChiPhi(text: string, bac: keyof typeof CHI_PHI_MODEL): number {
  const tokens = Math.ceil(text.length / 4)
  return (tokens / 1000) * CHI_PHI_MODEL[bac].chiPhi1K
}