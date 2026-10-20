import type { Word } from '../types'
import { mk } from './kit'

/* Colours, numbers, shapes and opposites: the fixed ids below are used by the games. Child-only. */

const c = mk('colors', 'describe', 'child')
export const COLORS: Word[] = [
  c('color_red', 'qizil', 'красный', 'кр+асный', 'red_circle'),
  c('color_blue', 'koʻk', 'синий', 'с+иний', 'blue_circle'),
  c('color_green', 'yashil', 'зелёный', 'зел+ёный', 'green_circle'),
  c('color_yellow', 'sariq', 'жёлтый', 'ж+ёлтый', 'yellow_circle'),
  c('color_orange', 'toʻq sariq', 'оранжевый', 'оранж+евый', 'orange_circle'),
  c('color_purple', 'binafsha', 'фиолетовый', 'фиолет+овый', 'purple_circle'),
  c('color_pink', 'pushti', 'розовый', 'роз+овый', 'color_pink'),
  c('color_white', 'oq', 'белый', 'б+елый', 'white_circle'),
  c('color_black', 'qora', 'чёрный', 'ч+ёрный', 'black_circle'),
  c('color_brown', 'jigarrang', 'коричневый', 'коричн+евый', 'brown_circle'),
  c('color_gray', 'kulrang', 'серый', 'с+ерый', 'color_gray'),
  c('color_light_blue', 'havorang', 'голубой', 'голуб+ой', 'color_light_blue'),
  c('color_turquoise', 'feruza rang', 'бирюзовый', 'бирюз+овый', 'color_turquoise'),
  c('color_gold', 'oltin rang', 'золотой', 'золот+ой', 'color_gold'),
  c('color_rainbow', 'kamalak', 'радуга', 'р+адуга', 'rainbow', true),
  c('color_paint', 'rang', 'цвет', 'цвет', 'artist_palette'),
]

const n = mk('numbers', 'misc', 'child')
export const NUMBERS: Word[] = [
  n('number_1', 'bir', 'один', 'од+ин', 'keycap_1'),
  n('number_2', 'ikki', 'два', 'два', 'keycap_2'),
  n('number_3', 'uch', 'три', 'три', 'keycap_3'),
  n('number_4', 'toʻrt', 'четыре', 'чет+ыре', 'keycap_4'),
  n('number_5', 'besh', 'пять', 'пять', 'keycap_5'),
  n('number_6', 'olti', 'шесть', 'шесть', 'keycap_6'),
  n('number_7', 'yetti', 'семь', 'семь', 'keycap_7'),
  n('number_8', 'sakkiz', 'восемь', 'в+осемь', 'keycap_8'),
  n('number_9', 'toʻqqiz', 'девять', 'д+евять', 'keycap_9'),
  n('number_10', 'oʻn', 'десять', 'д+есять', 'keycap_10'),
  n('number_11', 'oʻn bir', 'одиннадцать', 'одинн+адцать', 'number_11'),
  n('number_12', 'oʻn ikki', 'двенадцать', 'двен+адцать', 'number_12'),
  n('number_13', 'oʻn uch', 'тринадцать', 'трин+адцать', 'number_13'),
  n('number_14', 'oʻn toʻrt', 'четырнадцать', 'четырн+адцать', 'number_14'),
  n('number_15', 'oʻn besh', 'пятнадцать', 'пятн+адцать', 'number_15'),
  n('number_16', 'oʻn olti', 'шестнадцать', 'шестн+адцать', 'number_16'),
  n('number_17', 'oʻn yetti', 'семнадцать', 'семн+адцать', 'number_17'),
  n('number_18', 'oʻn sakkiz', 'восемнадцать', 'восемн+адцать', 'number_18'),
  n('number_19', 'oʻn toʻqqiz', 'девятнадцать', 'девятн+адцать', 'number_19'),
  n('number_20', 'yigirma', 'двадцать', 'дв+адцать', 'number_20'),
]

const sh = mk('shapes', 'describe', 'child')
export const SHAPES: Word[] = [
  sh('shape_circle', 'doira', 'круг', 'круг', 'shape_circle'),
  sh('shape_square', 'kvadrat', 'квадрат', 'квадр+ат', 'shape_square'),
  sh('shape_triangle', 'uchburchak', 'треугольник', 'треуг+ольник', 'shape_triangle'),
  sh('shape_rectangle', 'toʻrtburchak', 'прямоугольник', 'прямоуг+ольник', 'shape_rectangle'),
  sh('shape_star', 'yulduz', 'звезда', 'звезд+а', 'shape_star'),
  sh('shape_heart', 'yurak', 'сердце', 'с+ердце', 'shape_heart'),
  sh('shape_oval', 'oval', 'овал', 'ов+ал', 'shape_oval'),
  sh('shape_diamond', 'romb', 'ромб', 'ромб', 'shape_diamond'),
  sh('shape_hexagon', 'oltiburchak', 'шестиугольник', 'шестиугольн+ик', 'shape_hexagon'),
  sh('shape_pentagon', 'beshburchak', 'пятиугольник', 'пятиугольн+ик', 'shape_pentagon'),
  sh('shape_crescent', 'yarim oy', 'полумесяц', 'полум+есяц', 'shape_crescent'),
  sh('shape_cube', 'kub', 'куб', 'куб', 'shape_cube'),
  sh('shape_cylinder', 'silindr', 'цилиндр', 'цил+индр', 'shape_cylinder'),
  sh('shape_cone', 'konus', 'конус', 'к+онус', 'shape_cone'),
  sh('shape_pyramid', 'piramida', 'пирамида', 'пирам+ида', 'shape_pyramid'),
  sh('shape_arrow', 'strelka', 'стрелка', 'стр+елка', 'shape_arrow'),
]

/** Pairs stay adjacent: (a, b), (a, b), … Some uz/ru texts deliberately repeat base words (katta/kichik, issiq/sovuq, xursand/xafa): the games need them as pairs. */
const o = mk('opposites', 'describe', 'child')
export const OPPOSITES: Word[] = [
  o('opp_big', 'katta', 'большой', 'больш+ой', 'size_big'),
  o('opp_small', 'kichik', 'маленький', 'м+аленький', 'size_small'),
  o('opp_hot', 'issiq', 'горячий', 'гор+ячий', 'hot_face'),
  o('opp_cold', 'sovuq', 'холодный', 'хол+одный', 'cold_face'),
  o('opp_fast', 'tez', 'быстро', 'б+ыстро', 'racing_car'),
  o('opp_slow', 'sekin', 'медленно', 'м+едленно', 'snail'),
  o('opp_up', 'yuqorida', 'вверху', 'вверх+у', 'up_arrow'),
  o('opp_down', 'pastda', 'внизу', 'вниз+у', 'down_arrow'),
  o('opp_open', 'ochiq', 'открыто', 'откр+ыто', 'open_file_folder'),
  o('opp_closed', 'yopiq', 'закрыто', 'закр+ыто', 'file_folder'),
  o('opp_full', 'toʻla', 'полный', 'п+олный', 'glass_full'),
  o('opp_empty', 'boʻsh', 'пустой', 'пуст+ой', 'glass_empty'),
  o('opp_clean', 'toza', 'чистый', 'ч+истый', 'clean_shirt'),
  o('opp_dirty', 'iflos', 'грязный', 'гр+язный', 'dirty_shirt'),
  o('opp_light', 'yengil', 'лёгкий', 'л+ёгкий', 'feather'),
  o('opp_heavy', 'ogʻir', 'тяжёлый', 'тяж+ёлый', 'weight_heavy'),
  o('opp_day', 'kunduz', 'день', 'день', 'sun'),
  o('opp_night', 'tun', 'ночь', 'ночь', 'crescent_moon'),
  o('opp_happy', 'xursand', 'весёлый', 'вес+ёлый', 'beaming_face_with_smiling_eyes'),
  o('opp_sad', 'xafa', 'грустный', 'гр+устный', 'frowning_face'),
]
