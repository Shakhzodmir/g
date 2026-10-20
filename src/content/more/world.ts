import type { Word } from '../types'
import { mk } from './kit'

/* Transport, jobs, city places, nature, weather & seasons, tools. */

const tr = mk('transport', 'thing')
export const TRANSPORT: Word[] = [
  tr('taxi', 'taksi', 'такси', 'такс+и', 'taxi', true),
  tr('truck', 'yuk mashinasi', 'грузовик', 'грузов+ик', 'delivery_truck'),
  tr('tractor', 'traktor', 'трактор', 'тр+актор', 'tractor', true),
  tr('motorcycle', 'mototsikl', 'мотоцикл', 'мотоц+икл', 'motorcycle', true),
  tr('scooter', 'samokat', 'самокат', 'самок+ат', 'kick_scooter', true),
  tr('boat', 'qayiq', 'лодка', 'л+одка', 'canoe', true),
  tr('ship', 'kema', 'корабль', 'кор+абль', 'passenger_ship', true),
  tr('metro', 'metro', 'метро', 'метр+о', 'metro', true),
  tr('tram', 'tramvay', 'трамвай', 'трамв+ай', 'tram', true),
  tr('trolleybus', 'troleybus', 'троллейбус', 'тролл+ейбус', 'trolleybus', true),
  tr('fire_engine', 'yongʻin mashinasi', 'пожарная машина', 'пож+арная маш+ина', 'fire_engine'),
  tr('police_car', 'politsiya mashinasi', 'полицейская машина', 'полиц+ейская маш+ина', 'police_car'),
  tr('rocket', 'raketa', 'ракета', 'рак+ета', 'rocket', true),
  tr('minibus', 'marshrutka', 'маршрутка', 'маршр+утка', 'minibus', true),
  tr('road', 'yoʻl', 'дорога', 'дор+ога', 'motorway', true),
  tr('traffic_light', 'svetofor', 'светофор', 'светоф+ор', 'vertical_traffic_light', true),
  tr('bus_stop', 'bekat', 'остановка', 'остан+овка', 'bus_stop', true),
  tr('gas_station', 'zapravka', 'заправка', 'запр+авка', 'fuel_pump', true),
  tr('wheel', 'gʻildirak', 'колесо', 'колес+о', 'wheel', true),
  tr('railway', 'temir yoʻl', 'железная дорога', 'жел+езная дор+ога', 'railway_track'),
  tr('airport', 'aeroport', 'аэропорт', 'аэроп+орт', 'airplane_departure', true),
  tr('parachute', 'parashyut', 'парашют', 'параш+ют', 'parachute', true),
]

const jb = mk('jobs', 'people')
export const JOBS: Word[] = [
  jb('cook', 'oshpaz', 'повар', 'п+овар', 'man_cook', true),
  jb('farmer', 'dehqon', 'фермер', 'ф+ермер', 'farmer', true),
  jb('builder', 'quruvchi', 'строитель', 'стро+итель', 'construction_worker', true),
  jb('firefighter', 'yongʻinchi', 'пожарный', 'пож+арный', 'firefighter', true),
  jb('police', 'politsiyachi', 'полицейский', 'полиц+ейский', 'police_officer', true),
  jb('pilot', 'uchuvchi', 'лётчик', 'л+ётчик', 'pilot', true),
  jb('astronaut', 'kosmonavt', 'космонавт', 'космон+авт', 'astronaut', true),
  jb('painter', 'rassom', 'художник', 'худ+ожник', 'artist', true),
  jb('singer', 'xonanda', 'певец', 'пев+ец', 'singer', true),
  jb('mechanic', 'usta', 'мастер', 'м+астер', 'mechanic', true),
  jb('scientist', 'olim', 'учёный', 'уч+ёный', 'scientist', true),
  jb('programmer', 'dasturchi', 'программист', 'программ+ист', 'technologist', true),
  jb('guard', 'qoʻriqchi', 'охранник', 'охр+анник', 'guard', true),
  jb('photographer', 'fotograf', 'фотограф', 'фотогр+аф', 'camera', true),
  jb('tailor', 'tikuvchi', 'швея', 'шве+я', 'sewing_needle', true),
  jb('student', 'oʻquvchi', 'школьник', 'школьн+ик', 'student', true),
  jb('job', 'ish', 'работа', 'раб+ота', 'briefcase', true),
]

const ct = mk('city', 'thing')
export const CITY: Word[] = [
  ct('bridge', 'koʻprik', 'мост', 'мост', 'bridge_at_night'),
  ct('pharmacy', 'dorixona', 'аптека', 'апт+ека', 'pharmacy', true),
  ct('bank', 'bank', 'банк', 'банк', 'bank'),
  ct('post_office', 'pochta', 'почта', 'п+очта', 'post_office', true),
  ct('mosque', 'masjid', 'мечеть', 'меч+еть', 'mosque', true),
  ct('museum', 'muzey', 'музей', 'муз+ей', 'classical_building', true),
  ct('theater', 'teatr', 'театр', 'те+атр', 'performing_arts', true),
  ct('cinema', 'kinoteatr', 'кинотеатр', 'киноте+атр', 'cinema', true),
  ct('circus', 'sirk', 'цирк', 'цирк', 'circus_tent'),
  ct('stadium', 'stadion', 'стадион', 'стад+ион', 'stadium', true),
  ct('train_station', 'vokzal', 'вокзал', 'вокз+ал', 'station', true),
  ct('supermarket', 'supermarket', 'супермаркет', 'суперм+аркет', 'shopping_cart', true),
  ct('cafe', 'kafe', 'кафе', 'каф+е', 'fork_and_knife_with_plate', true),
  ct('factory', 'zavod', 'завод', 'зав+од', 'factory', true),
  ct('construction', 'qurilish', 'стройка', 'стр+ойка', 'building_construction', true),
  ct('city', 'shahar', 'город', 'г+ород', 'cityscape', true),
  ct('field', 'dala', 'поле', 'п+оле', 'sheaf_of_rice', true),
  ct('amusement_park', 'attraksion', 'аттракционы', 'аттракци+оны', 'ferris_wheel'),
  ct('zoo', 'hayvonot bogʻi', 'зоопарк', 'зооп+арк', 'giraffe'),
]

const na = mk('nature', 'thing')
export const NATURE: Word[] = [
  na('tree', 'daraxt', 'дерево', 'д+ерево', 'deciduous_tree', true),
  na('leaf', 'barg', 'листок', 'лист+ок', 'leafy_green'),
  na('flower', 'gul', 'цветок', 'цвет+ок', 'blossom'),
  na('rose', 'atirgul', 'роза', 'р+оза', 'rose', true),
  na('tulip', 'lola', 'тюльпан', 'тюльп+ан', 'tulip', true),
  na('sunflower', 'kungaboqar', 'подсолнух', 'подс+олнух', 'sunflower', true),
  na('seedling', 'nihol', 'росток', 'рост+ок', 'seedling', true),
  na('mountain', 'togʻ', 'гора', 'гор+а', 'mountain'),
  na('river', 'daryo', 'река', 'рек+а', 'river', true),
  na('sea', 'dengiz', 'море', 'м+оре', 'sea_waves', true),
  na('moon', 'oy', 'луна', 'лун+а', 'full_moon'),
  na('stone', 'tosh', 'камень', 'к+амень', 'rock'),
  na('desert', 'choʻl', 'пустыня', 'пуст+ыня', 'desert', true),
  na('forest', 'oʻrmon', 'лес', 'лес', 'evergreen_tree', true),
  na('cactus', 'kaktus', 'кактус', 'к+актус', 'cactus', true),
  na('palm', 'palma', 'пальма', 'п+альма', 'palm_tree', true),
  na('earth', 'Yer', 'Земля', 'Земл+я', 'globe_showing_asia_australia'),
  na('volcano', 'vulqon', 'вулкан', 'вулк+ан', 'volcano', true),
  na('nest', 'uya', 'гнездо', 'гнезд+о', 'nest_with_eggs', true),
  na('cotton', 'paxta', 'хлопок', 'хл+опок', 'cotton', true),
  na('island', 'orol', 'остров', '+остров', 'desert_island', true),
]

const we = mk('weather', 'thing')
export const WEATHER: Word[] = [
  we('cloud', 'bulut', 'облако', 'обл+ако', 'cloud', true),
  we('fog', 'tuman', 'туман', 'тум+ан', 'fog', true),
  we('thunderstorm', 'momaqaldiroq', 'гроза', 'гроз+а', 'cloud_with_lightning_and_rain'),
  we('umbrella', 'soyabon', 'зонт', 'зонт', 'umbrella', true),
  we('snowflake', 'qor parchasi', 'снежинка', 'снеж+инка', 'snowflake'),
  we('ice', 'muz', 'лёд', 'лёд', 'ice'),
  we('thermometer', 'termometr', 'термометр', 'термом+етр', 'thermometer', true),
  we('spring', 'bahor', 'весна', 'весн+а', 'cherry_blossom', true),
  we('summer', 'yoz', 'лето', 'л+ето', 'beach_with_umbrella'),
  we('autumn', 'kuz', 'осень', '+осень', 'fallen_leaf'),
  we('winter', 'qish', 'зима', 'зим+а', 'snowman'),
  we('sunny', 'quyoshli', 'солнечно', 'с+олнечно', 'sun_behind_small_cloud'),
  we('cloudy', 'bulutli', 'облачно', 'обл+ачно', 'cloud'),
  we('windy', 'shamolli', 'ветрено', 'в+етрено', 'wind_face'),
  we('weather', 'ob-havo', 'погода', 'пог+ода', 'sun_behind_large_cloud'),
]

const to = mk('tools', 'thing')
export const TOOLS: Word[] = [
  to('hammer', 'bolgʻa', 'молоток', 'молот+ок', 'hammer', true),
  to('screwdriver', 'otvyortka', 'отвёртка', 'отв+ёртка', 'screwdriver', true),
  to('wrench', 'gayka kaliti', 'гаечный ключ', 'г+аечный ключ', 'wrench'),
  to('saw', 'arra', 'пила', 'пил+а', 'carpentry_saw', true),
  to('axe', 'bolta', 'топор', 'топ+ор', 'axe', true),
  to('nut', 'gayka', 'гайка', 'г+айка', 'nut_and_bolt', true),
  to('ladder', 'narvon', 'стремянка', 'стрем+янка', 'ladder', true),
  to('toolbox', 'asboblar qutisi', 'ящик с инструментами', '+ящик с инструмент+ами', 'toolbox'),
  to('magnet', 'magnit', 'магнит', 'магн+ит', 'magnet', true),
  to('flashlight', 'fonar', 'фонарик', 'фонар+ик', 'flashlight', true),
  to('battery', 'batareya', 'батарейка', 'батар+ейка', 'battery', true),
  to('needle', 'igna', 'иголка', 'иг+олка', 'sewing_needle', true),
  to('thread', 'ip', 'нитка', 'н+итка', 'thread', true),
  to('rope', 'arqon', 'верёвка', 'вер+ёвка', 'knot', true),
  to('magnifier', 'lupa', 'лупа', 'л+упа', 'magnifying_glass_tilted_right', true),
  to('compass', 'kompas', 'компас', 'комп+ас', 'compass', true),
  to('scales', 'tarozi', 'весы', 'вес+ы', 'balance_scale', true),
  to('broom', 'supurgi', 'веник', 'в+еник', 'broom', true),
  to('gear', 'shesternya', 'шестерёнка', 'шестер+ёнка', 'gear', true),
  to('chain', 'zanjir', 'цепь', 'цепь', 'chains'),
]
