// Prints (as JSON) every symbol id used by the children's additions in src/content/more.ts.
import { MORE_PHRASES, MORE_TOPICS, MORE_WORDS } from '../src/content/more'

const ids = new Set<string>()
for (const x of [...MORE_TOPICS, ...MORE_WORDS, ...MORE_PHRASES]) ids.add(x.symbol)
console.log(JSON.stringify([...ids].sort()))
