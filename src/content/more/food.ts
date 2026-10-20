import type { Word } from '../types'
import { mk } from './kit'

/* Food extensions (topic `food`), bakery & sweets, fruits, vegetables and the kitchen. */

const f = mk('food', 'thing')
export const FOOD_MORE: Word[] = [
  f('meal', 'ovqat', 'еда', 'ед+а', 'shallow_pan_of_food', true),
  f('butter', 'saryogʻ', 'масло', 'м+асло', 'butter', true),
  f('cheese', 'pishloq', 'сыр', 'сыр', 'cheese_wedge', true),
  f('sandwich', 'buterbrod', 'бутерброд', 'бутербр+од', 'sandwich', true),
  f('pizza', 'pitsa', 'пицца', 'п+ицца', 'pizza', true),
  f('burger', 'burger', 'бургер', 'б+ургер', 'hamburger', true),
  f('fries', 'kartoshka fri', 'картошка фри', 'карт+ошка фри', 'french_fries'),
  f('salad', 'salat', 'салат', 'сал+ат', 'green_salad', true),
  f('chicken_meat', 'tovuq goʻshti', 'куриное мясо', 'кур+иное м+ясо', 'poultry_leg'),
  f('peanuts', 'yeryongʻoq', 'арахис', 'ар+ахис', 'peanuts', true),
  f('salt', 'tuz', 'соль', 'соль', 'salt'),
]

const b = mk('bakery', 'thing')
export const BAKERY: Word[] = [
  b('cake', 'tort', 'торт', 'торт', 'shortcake'),
  b('cupcake', 'keks', 'кекс', 'кекс', 'cupcake'),
  b('cookie', 'pechenye', 'печенье', 'печ+енье', 'cookie', true),
  b('doughnut', 'ponchik', 'пончик', 'п+ончик', 'doughnut', true),
  b('chocolate', 'shokolad', 'шоколад', 'шокол+ад', 'chocolate_bar', true),
  b('lollipop', 'chupachups', 'леденец', 'леден+ец', 'lollipop', true),
  b('honey', 'asal', 'мёд', 'мёд', 'honey_pot', true),
  b('waffle', 'vafli', 'вафли', 'в+афли', 'waffle', true),
  b('pie', 'pirog', 'пирог', 'пир+ог', 'pie', true),
  b('pancakes', 'blin', 'блины', 'блин+ы', 'pancakes'),
  b('croissant', 'kruassan', 'круассан', 'круасс+ан', 'croissant', true),
  b('bagel', 'bublik', 'бублик', 'б+ублик', 'bagel', true),
  b('loaf', 'bulka', 'булка', 'б+улка', 'bread', true),
  b('baguette', 'baget', 'багет', 'баг+ет', 'baguette_bread', true),
  b('popcorn', 'popkorn', 'попкорн', 'попк+орн', 'popcorn', true),
]

const fr = mk('fruits', 'thing')
export const FRUITS: Word[] = [
  fr('pear', 'nok', 'груша', 'гр+уша', 'pear'),
  fr('cherry', 'gilos', 'черешня', 'чер+ешня', 'cherries', true),
  fr('strawberry', 'qulupnay', 'клубника', 'клубн+ика', 'strawberry', true),
  fr('lemon', 'limon', 'лимон', 'лим+он', 'lemon', true),
  fr('mandarin', 'mandarin', 'мандарин', 'мандар+ин', 'tangerine', true),
  fr('kiwi', 'kivi', 'киви', 'к+иви', 'kiwi_fruit', true),
  fr('pineapple', 'ananas', 'ананас', 'анан+ас', 'pineapple', true),
  fr('mango', 'mango', 'манго', 'м+анго', 'mango', true),
  fr('coconut', 'kokos', 'кокос', 'кок+ос', 'coconut', true),
  fr('blueberry', 'chernika', 'черника', 'черн+ика', 'blueberries', true),
  fr('avocado', 'avokado', 'авокадо', 'авок+адо', 'avocado', true),
  fr('olive', 'zaytun', 'оливка', 'ол+ивка', 'olive', true),
  fr('apricot', 'oʻrik', 'абрикос', 'абрик+ос', 'apricot', true),
  fr('plum', 'olxoʻri', 'слива', 'сл+ива', 'plum', true),
  fr('fig', 'anjir', 'инжир', 'инж+ир', 'fig', true),
  fr('quince', 'behi', 'айва', 'айв+а', 'quince', true),
  fr('mulberry', 'tut', 'шелковица', 'шелк+овица', 'mulberry'),
]

const v = mk('vegetables', 'thing')
export const VEGETABLES: Word[] = [
  v('onion', 'piyoz', 'лук', 'лук', 'onion'),
  v('garlic', 'sarimsoq', 'чеснок', 'чесн+ок', 'garlic', true),
  v('eggplant', 'baqlajon', 'баклажан', 'баклаж+ан', 'eggplant', true),
  v('bell_pepper', 'bulgʻor qalampiri', 'болгарский перец', 'болг+арский пер+ец', 'bell_pepper'),
  v('chili', 'achchiq qalampir', 'острый перец', '+острый пер+ец', 'hot_pepper'),
  v('broccoli', 'brokkoli', 'брокколи', 'брокк+оли', 'broccoli', true),
  v('corn', 'makkajoʻxori', 'кукуруза', 'кукур+уза', 'ear_of_corn', true),
  v('mushroom', 'qoʻziqorin', 'гриб', 'гриб', 'mushroom'),
  v('peas', 'noʻxat', 'горох', 'гор+ох', 'pea_pod', true),
  v('beans', 'loviya', 'фасоль', 'фас+оль', 'beans', true),
  v('greens', 'koʻkat', 'зелень', 'з+елень', 'herb', true),
  v('pumpkin', 'qovoq', 'тыква', 'т+ыква', 'pumpkin', true),
  v('cabbage', 'karam', 'капуста', 'кап+уста', 'cabbage', true),
  v('sweet_potato', 'shirin kartoshka', 'батат', 'бат+ат', 'roasted_sweet_potato'),
]

const k = mk('kitchen', 'thing')
export const KITCHEN: Word[] = [
  k('plate', 'likop', 'тарелка', 'тар+елка', 'plate', true),
  k('spoon', 'qoshiq', 'ложка', 'л+ожка', 'spoon', true),
  k('fork', 'sanchqi', 'вилка', 'в+илка', 'fork', true),
  k('knife', 'pichoq', 'нож', 'нож', 'kitchen_knife', true),
  k('cup', 'piyola', 'пиала', 'пиал+а', 'piyola', true),
  k('bowl', 'kosa', 'миска', 'м+иска', 'bowl', true),
  k('cauldron', 'qozon', 'казан', 'каз+ан', 'qozon', true),
  k('frying_pan', 'tova', 'сковорода', 'сковород+а', 'frying_pan', true),
  k('tandir', 'tandir', 'тандыр', 'танд+ыр', 'tandir', true),
  k('fridge', 'muzlatgich', 'холодильник', 'холод+ильник', 'fridge', true),
  k('stove', 'gaz plita', 'плита', 'плит+а', 'stove'),
  k('tray', 'patnis', 'поднос', 'подн+ос', 'tray', true),
  k('tablecloth', 'dasturxon', 'скатерть', 'ск+атерть', 'tablecloth', true),
  k('basket', 'savat', 'корзина', 'корз+ина', 'basket', true),
]
