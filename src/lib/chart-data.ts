export type SihuaType = '化禄' | '化权' | '化科' | '化忌'

export type MainStar = {
  name: string
  sihua?: SihuaType
}

export type Palace = {
  id: string
  name: string
  branch: string
  mainStars: MainStar[]
  minorStars: string[]
  keywords: string[]
  rating: number // 1 - 5, palace energy strength
  summary: string
  aiTraits: string[]
  basis: string[]
  related: string[]
}

/**
 * Twelve palaces in canonical 顺行 order starting from 命宫.
 * This ordering makes the geometry meaningful:
 *   三方 (trine) = index, index+4, index+8
 *   对宫 (opposition / 四正) = index+6
 * e.g. 命宫(0) → 财帛(4) + 官禄(8) + 迁移(6): the classic 命-财-官 triangle.
 */
export const PALACES: Palace[] = [
  {
    id: 'ming',
    name: '命宫',
    branch: '午',
    mainStars: [{ name: '紫微', sihua: '化权' }, { name: '天府' }],
    minorStars: ['左辅', '文昌'],
    keywords: ['主导', '担当', '自律'],
    rating: 5,
    summary: '紫微天府同宫，格局稳重，天生带有掌控节奏的气场。',
    aiTraits: ['责任感强，习惯为结果负责', '领导倾向明显，擅长统筹全局', '对自我要求偏高，需留意过度紧绷'],
    basis: ['紫微', '天府', '化权'],
    related: ['事业', '财富', '迁移'],
  },
  {
    id: 'siblings',
    name: '兄弟',
    branch: '未',
    mainStars: [{ name: '太阴' }],
    minorStars: ['天钺'],
    keywords: ['情谊', '扶持', '内敛'],
    rating: 3,
    summary: '太阴主柔，手足与挚友之间温和相待，情感细腻。',
    aiTraits: ['重视亲密关系中的情绪连结', '倾向以柔性方式化解冲突', '偶有过度替他人着想的倾向'],
    basis: ['太阴'],
    related: ['关系', '内心', '福德'],
  },
  {
    id: 'spouse',
    name: '夫妻',
    branch: '申',
    mainStars: [{ name: '贪狼', sihua: '化禄' }],
    minorStars: ['右弼'],
    keywords: ['热情', '吸引', '变化'],
    rating: 4,
    summary: '贪狼化禄坐守，感情充满魅力与机缘，需要新鲜与深度并存。',
    aiTraits: ['关系中富有魅力，容易被欣赏', '追求精神与情趣的双重共鸣', '需警惕因求新而分散专注'],
    basis: ['贪狼', '化禄'],
    related: ['关系', '桃花', '大运'],
  },
  {
    id: 'children',
    name: '子女',
    branch: '酉',
    mainStars: [{ name: '巨门' }],
    minorStars: ['文曲'],
    keywords: ['表达', '思辨', '教养'],
    rating: 3,
    summary: '巨门主口舌与思辨，与晚辈、创作之间以言语沟通见长。',
    aiTraits: ['善于表达与传递观点', '重视逻辑与真相', '沟通时宜多给对方回应空间'],
    basis: ['巨门'],
    related: ['创作', '关系', '表达'],
  },
  {
    id: 'wealth',
    name: '财帛',
    branch: '戌',
    mainStars: [{ name: '武曲', sihua: '化科' }, { name: '天相' }],
    minorStars: ['禄存'],
    keywords: ['务实', '理财', '声誉'],
    rating: 5,
    summary: '武曲化科配天相，财务讲求条理，正财稳健、口碑加分。',
    aiTraits: ['理财务实，重视长期积累', '以专业与信用建立财富', '偏财宜谨慎，稳中求进为上'],
    basis: ['武曲', '天相', '化科'],
    related: ['财富', '事业', '命宫'],
  },
  {
    id: 'health',
    name: '疾厄',
    branch: '亥',
    mainStars: [{ name: '天梁' }],
    minorStars: ['天魁'],
    keywords: ['调养', '韧性', '荫护'],
    rating: 3,
    summary: '天梁有逢凶化吉之意，体质具韧性，宜规律作息以蓄能。',
    aiTraits: ['身心恢复力较好', '压力多积于思虑', '规律与留白是最佳的养护'],
    basis: ['天梁'],
    related: ['作息', '内心', '福德'],
  },
  {
    id: 'travel',
    name: '迁移',
    branch: '子',
    mainStars: [{ name: '七杀' }],
    minorStars: ['擎羊'],
    keywords: ['开拓', '决断', '远行'],
    rating: 4,
    summary: '七杀主开创，外出与转换环境时能量最强，宜主动出击。',
    aiTraits: ['在变动中反而更能发挥', '决断果敢，行动力强', '节奏过猛时需给自己缓冲'],
    basis: ['七杀'],
    related: ['事业', '大运', '命宫'],
  },
  {
    id: 'friends',
    name: '交友',
    branch: '丑',
    mainStars: [],
    minorStars: ['铃星'],
    keywords: ['借力', '筛选', '缘分'],
    rating: 2,
    summary: '本宫无主星，人脉靠借宫之力，重质不重量，贵人可期。',
    aiTraits: ['交友讲缘分与质量', '善于从少数深交中获得支持', '宜主动经营核心人脉'],
    basis: ['借对宫'],
    related: ['关系', '事业', '贵人'],
  },
  {
    id: 'career',
    name: '官禄',
    branch: '寅',
    mainStars: [{ name: '破军' }],
    minorStars: ['火星'],
    keywords: ['革新', '魄力', '重塑'],
    rating: 5,
    summary: '破军主变革，事业适合破旧立新，在转型与挑战中脱颖而出。',
    aiTraits: ['擅长在变局中重塑格局', '不惧从零开始的项目', '成事之后宜巩固而非频繁推倒'],
    basis: ['破军'],
    related: ['事业', '财富', '命宫'],
  },
  {
    id: 'property',
    name: '田宅',
    branch: '卯',
    mainStars: [{ name: '天机' }, { name: '太阳' }],
    minorStars: ['陀罗'],
    keywords: ['根基', '流动', '光热'],
    rating: 4,
    summary: '天机太阳照田宅，居所与资产富流动性，环境明亮利心境。',
    aiTraits: ['喜欢可调整、可成长的居住环境', '资产配置灵活', '明亮开阔的空间最能安顿身心'],
    basis: ['天机', '太阳'],
    related: ['资产', '家庭', '作息'],
  },
  {
    id: 'fortune',
    name: '福德',
    branch: '辰',
    mainStars: [{ name: '天同', sihua: '化忌' }],
    minorStars: ['文昌'],
    keywords: ['安顿', '兴趣', '思虑'],
    rating: 2,
    summary: '天同化忌坐福德，心思细腻但易多虑，安顿内在是本命课题。',
    aiTraits: ['内在世界丰富，感受敏锐', '容易为未发生之事忧心', '培养兴趣与正念可显著回稳'],
    basis: ['天同', '化忌'],
    related: ['内心', '兴趣', '作息'],
  },
  {
    id: 'parents',
    name: '父母',
    branch: '巳',
    mainStars: [{ name: '廉贞' }],
    minorStars: ['天钺'],
    keywords: ['规范', '传承', '缘深'],
    rating: 3,
    summary: '廉贞主纪律，与长辈之间既有规范也有深缘，宜以尊重相处。',
    aiTraits: ['受长辈影响形成的原则较强', '重视规矩与边界', '沟通时以理解代替对抗更顺'],
    basis: ['廉贞'],
    related: ['关系', '传承', '内心'],
  },
]

export const SIHUA_TONE: Record<SihuaType, string> = {
  化禄: 'var(--emerald)',
  化权: 'var(--violet)',
  化科: 'var(--blue)',
  化忌: 'var(--gold)',
}

/** Trine + opposition indices for 三方四正 highlighting. */
export function getRelatedIndices(index: number) {
  const trineA = (index + 4) % 12
  const trineB = (index + 8) % 12
  const opposite = (index + 6) % 12
  return { trine: [index, trineA, trineB], opposite }
}
