import { useState } from 'react'
import styles from './SymbolImg.module.css'

/** Symbols drawn for Uzbek realia (public/symbols/custom/*.svg); everything else is Fluent Emoji 3D WebP. */
export const CUSTOM_SYMBOLS = new Set(['anor', 'non', 'doppi', 'somsa', 'palov', 'qorin', 'size_big', 'size_small', 'different', 'doll', 'blocks', 'body_back', 'body_stomach', 'towel', 'sugar', 'body_throat', 'body_neck', 'body_shoulder', 'body_chest', 'body_side', 'body_upper_back', 'body_lower_back', 'body_arm', 'body_elbow', 'body_wrist', 'body_hip', 'body_knee', 'body_ankle', 'table', 'door_plain', 'num_20', 'num_30', 'num_40', 'num_50', 'num_60', 'num_70', 'num_80', 'num_90', 'num_100', 'num_1000', 'num_half', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6', 'day_7', 'no_salt', 'no_sugar', 'no_fat',
  // child vocabulary additions (scripts/gen-child-symbols.mjs, scripts/gen-number-symbols.mjs)
  'apricot', 'apron', 'ayvon', 'belt', 'blackboard', 'blanket', 'bowl', 'button', 'cabbage', 'carpet', 'chalk', 'chapan', 'clean_shirt', 'color_gold', 'color_gray', 'color_light_blue', 'color_pink', 'color_turquoise', 'comb', 'cotton', 'cradle', 'curtain', 'desk', 'dirty_shirt', 'doira', 'dutor', 'eraser', 'face_cheek', 'face_chin', 'face_eyebrow', 'face_forehead', 'face_lips', 'fig', 'fork', 'fridge', 'frying_pan', 'glass_empty', 'glass_full', 'glue', 'house_door', 'kid_table', 'kid_towel', 'mattress', 'mulberry', 'navroz', 'number_11', 'number_12', 'number_13', 'number_14', 'number_15', 'number_16', 'number_17', 'number_18', 'number_19', 'number_20', 'pajamas', 'part_back', 'part_chest', 'part_elbow', 'part_knee', 'part_neck', 'part_shoulder', 'pencil_case', 'pharmacy', 'pillow', 'piyola', 'plate', 'plum', 'pocket', 'pos_behind', 'pos_between', 'pos_far', 'pos_front', 'pos_in', 'pos_middle', 'pos_near', 'pos_next', 'pos_on', 'pos_out', 'pos_under', 'pumpkin', 'qozon', 'quince', 'river', 'sea_waves', 'shape_arrow', 'shape_circle', 'shape_cone', 'shape_crescent', 'shape_cube', 'shape_cylinder', 'shape_diamond', 'shape_heart', 'shape_hexagon', 'shape_oval', 'shape_pentagon', 'shape_pyramid', 'shape_rectangle', 'shape_square', 'shape_star', 'shape_triangle', 'sharpener', 'shelf', 'skirt', 'sofa', 'stairs', 'stove', 'sweater', 'swing', 'tablecloth', 'tandir', 'tap', 'tissues', 'toothpaste', 'tray', 'wardrobe', 'weight_heavy', 'winter_hat', 'zipper'])

export function symbolUrl(id: string): string {
  const base = import.meta.env.BASE_URL
  return CUSTOM_SYMBOLS.has(id) ? `${base}symbols/custom/${id}.svg` : `${base}symbols/${id}.webp`
}

export interface SymbolImgProps {
  id: string
  /** Rendered size in CSS px (square); omit to fill the parent. */
  size?: number
  /** Use '' when a visible text label sits next to the symbol. */
  alt?: string
  /** Optional user photo (custom card) that replaces the symbol. */
  src?: string
  className?: string
}

export function SymbolImg({ id, size, alt = '', src, className }: SymbolImgProps) {
  const [failed, setFailed] = useState(false)
  const style = size ? { width: size, height: size } : undefined
  if (failed && !src) {
    return (
      <span className={[styles.fallback, className].filter(Boolean).join(' ')} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
        <span className={styles.dot} />
      </span>
    )
  }
  return (
    <img
      className={[styles.img, src && styles.photo, className].filter(Boolean).join(' ')}
      style={style}
      src={src ?? symbolUrl(id)}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
