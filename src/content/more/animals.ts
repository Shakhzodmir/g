import type { Word } from '../types'
import { mk } from './kit'

/* Animals: pets (extension of topic `animals`), birds & insects, sea animals, wild animals. */

const an = mk('animals', 'thing')
export const ANIMALS_MORE: Word[] = [
  an('hamster', 'xomyak', 'хомяк', 'хом+як', 'hamster', true),
  an('puppy', 'kuchukcha', 'щенок', 'щен+ок', 'dog_face', true, 'child'),
  an('kitten', 'mushukcha', 'котёнок', 'кот+ёнок', 'cat_face', true, 'child'),
]

const bi = mk('birds_insects', 'thing', 'child')
export const BIRDS_INSECTS: Word[] = [
  bi('eagle', 'burgut', 'орёл', 'ор+ёл', 'eagle', true),
  bi('goose', 'gʻoz', 'гусь', 'гусь', 'goose'),
  bi('swan', 'oqqush', 'лебедь', 'л+ебедь', 'swan', true),
  bi('turkey', 'kurka', 'индюк', 'инд+юк', 'turkey', true),
  bi('parrot', 'toʻti', 'попугай', 'попуг+ай', 'parrot', true),
  bi('peacock', 'tovus', 'павлин', 'павл+ин', 'peacock', true),
  bi('penguin', 'pingvin', 'пингвин', 'пингв+ин', 'penguin', true),
  bi('flamingo', 'flamingo', 'фламинго', 'флам+инго', 'flamingo', true),
  bi('chick', 'joʻja', 'цыплёнок', 'цыпл+ёнок', 'baby_chick', true),
  bi('feather', 'par', 'перо', 'пер+о', 'feather'),
  bi('wing', 'qanot', 'крыло', 'крыл+о', 'wing', true),
  bi('ant', 'chumoli', 'муравей', 'мурав+ей', 'ant', true),
  bi('fly', 'pashsha', 'муха', 'м+уха', 'fly', true),
  bi('mosquito', 'chivin', 'комар', 'ком+ар', 'mosquito', true),
  bi('spider', 'oʻrgimchak', 'паук', 'па+ук', 'spider', true),
  bi('ladybug', 'xonqizi', 'божья коровка', 'б+ожья кор+овка', 'lady_beetle'),
  bi('beetle', 'qoʻngʻiz', 'жук', 'жук', 'beetle', true),
  bi('cricket', 'chigirtka', 'кузнечик', 'кузн+ечик', 'cricket', true),
  bi('worm', 'qurt', 'червяк', 'черв+як', 'worm'),
  bi('snail', 'shilliqqurt', 'улитка', 'ул+итка', 'snail', true),
  bi('spider_web', 'oʻrgimchak toʻri', 'паутина', 'паут+ина', 'spider_web'),
  bi('insect', 'hasharot', 'насекомое', 'насек+омое', 'bug', true),
]

const se = mk('sea', 'thing', 'child')
export const SEA: Word[] = [
  se('whale', 'kit', 'кит', 'кит', 'whale'),
  se('dolphin', 'delfin', 'дельфин', 'дельф+ин', 'dolphin', true),
  se('shark', 'akula', 'акула', 'ак+ула', 'shark', true),
  se('octopus', 'sakkizoyoq', 'осьминог', 'осьмин+ог', 'octopus', true),
  se('squid', 'kalmar', 'кальмар', 'кальм+ар', 'squid', true),
  se('crab', 'qisqichbaqa', 'краб', 'краб', 'crab'),
  se('lobster', 'omar', 'омар', 'ом+ар', 'lobster', true),
  se('jellyfish', 'meduza', 'медуза', 'мед+уза', 'jellyfish', true),
  se('seal', 'tyulen', 'тюлень', 'тюл+ень', 'seal', true),
  se('shrimp', 'krevetka', 'креветка', 'крев+етка', 'shrimp', true),
  se('pufferfish', 'shar baliq', 'рыба-шар', 'р+ыба-шар', 'blowfish'),
  se('shell', 'chigʻanoq', 'ракушка', 'рак+ушка', 'spiral_shell', true),
  se('coral', 'marjon', 'коралл', 'кор+алл', 'coral', true),
  se('anchor', 'langar', 'якорь', '+якорь', 'anchor', true),
  se('otter', 'suvsar', 'выдра', 'в+ыдра', 'otter', true),
]

const wi = mk('wild', 'thing', 'child')
export const WILD: Word[] = [
  wi('wolf', 'boʻri', 'волк', 'волк', 'wolf'),
  wi('fox', 'tulki', 'лиса', 'лис+а', 'fox', true),
  wi('bear', 'ayiq', 'медведь', 'медв+едь', 'bear', true),
  wi('tiger', 'yoʻlbars', 'тигр', 'тигр', 'tiger'),
  wi('leopard', 'qoplon', 'леопард', 'леоп+ард', 'leopard', true),
  wi('giraffe', 'jirafa', 'жираф', 'жир+аф', 'giraffe', true),
  wi('zebra', 'zebra', 'зебра', 'з+ебра', 'zebra', true),
  wi('rhino', 'karkidon', 'носорог', 'носор+ог', 'rhinoceros', true),
  wi('hippo', 'begemot', 'бегемот', 'бегем+от', 'hippopotamus', true),
  wi('crocodile', 'timsoh', 'крокодил', 'крокод+ил', 'crocodile', true),
  wi('kangaroo', 'kenguru', 'кенгуру', 'кенгур+у', 'kangaroo', true),
  wi('panda', 'panda', 'панда', 'п+анда', 'panda', true),
  wi('koala', 'koala', 'коала', 'ко+ала', 'koala', true),
  wi('gorilla', 'gorilla', 'горилла', 'гор+илла', 'gorilla', true),
  wi('deer', 'bugʻu', 'олень', 'ол+ень', 'deer', true),
  wi('squirrel', 'olmaxon', 'белка', 'б+елка', 'chipmunk', true),
  wi('hedgehog', 'tipratikan', 'ёжик', '+ёжик', 'hedgehog', true),
  wi('bat', 'koʻrshapalak', 'летучая мышь', 'лет+учая мышь', 'bat'),
  wi('mammoth', 'mamont', 'мамонт', 'м+амонт', 'mammoth', true),
  wi('snake', 'ilon', 'змея', 'зме+я', 'snake', true),
  wi('lizard', 'kaltakesak', 'ящерица', '+ящерица', 'lizard', true),
]
