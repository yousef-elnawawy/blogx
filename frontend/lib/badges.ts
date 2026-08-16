export interface BadgeDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  iconName: string;
  tier?: "legendary" | "epic" | "rare" | "common";
  gradient: string;
  borderColor: string;
  textColor: string;
  bgColor: string;
  glowColor: string;
  requiresVerified: boolean;
}

export const PLATFORM_BADGES: Record<string, BadgeDefinition> = {
  pro_author: {
    id: "pro_author",
    name: "Pro Author",
    nameAr: "كاتب محترف",
    description: "Published top-rated articles and stories.",
    descriptionAr: "كاتب متميز ينشر مقالات عالية القيمة.",
    iconName: "PenTool",
    tier: "epic",
    gradient: "from-amber-500 to-orange-600",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-500 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    glowColor: "rgba(245, 158, 11, 0.35)",
    requiresVerified: true,
  },
  dev_guru: {
    id: "dev_guru",
    name: "Tech Pioneer",
    nameAr: "رائد تقني",
    description: "Technology & engineering contributor.",
    descriptionAr: "رائد ومساهم في مجالات التقنية والبرمجيات.",
    iconName: "Code2",
    tier: "epic",
    gradient: "from-emerald-500 to-teal-600",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-500 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    glowColor: "rgba(16, 185, 129, 0.35)",
    requiresVerified: true,
  },
  community_champion: {
    id: "community_champion",
    name: "Community Champion",
    nameAr: "بطل المجتمع",
    description: "Influential community builder and leader.",
    descriptionAr: "عضو مؤثر وداعم بارز لمجتمع BlogX.",
    iconName: "Crown",
    tier: "epic",
    gradient: "from-purple-500 to-indigo-600",
    borderColor: "border-purple-500/40",
    textColor: "text-purple-500 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    glowColor: "rgba(139, 92, 246, 0.35)",
    requiresVerified: true,
  },
  vip_partner: {
    id: "vip_partner",
    name: "VIP Partner",
    nameAr: "شريك متميز",
    description: "Official institutional partner of BlogX.",
    descriptionAr: "شريك مؤسسي وتنفيذي معتمد على المنصة.",
    iconName: "Sparkles",
    tier: "legendary",
    gradient: "from-rose-500 to-pink-600",
    borderColor: "border-rose-500/40",
    textColor: "text-rose-500 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    glowColor: "rgba(244, 63, 94, 0.35)",
    requiresVerified: true,
  },
  trendsetter: {
    id: "trendsetter",
    name: "Trendsetter",
    nameAr: "صانع صيحات",
    description: "Consistently featured in trending discussions.",
    descriptionAr: "تتصدر منشوراته قائمة الشائع والمناقشات.",
    iconName: "Flame",
    tier: "rare",
    gradient: "from-red-500 to-orange-500",
    borderColor: "border-red-500/40",
    textColor: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-500/10",
    glowColor: "rgba(239, 68, 68, 0.35)",
    requiresVerified: true,
  },
  early_supporter: {
    id: "early_supporter",
    name: "Early Supporter",
    nameAr: "داعم مبكر",
    description: "Joined during BlogX foundation era.",
    descriptionAr: "انضم وشارك في فترة انطلاق BlogX الأولى.",
    iconName: "ShieldAlert",
    tier: "rare",
    gradient: "from-pink-500 to-rose-600",
    borderColor: "border-pink-500/40",
    textColor: "text-pink-500 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
    glowColor: "rgba(236, 72, 153, 0.35)",
    requiresVerified: false,
  },
  bug_hunter: {
    id: "bug_hunter",
    name: "Bug Hunter",
    nameAr: "باحث أمني",
    description: "Helped improve security and platform quality.",
    descriptionAr: "ساهم في الإبلاغ عن الثغرات وتحسين الجودة.",
    iconName: "ShieldCheck",
    tier: "rare",
    gradient: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500/40",
    textColor: "text-cyan-500 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    glowColor: "rgba(6, 182, 212, 0.35)",
    requiresVerified: false,
  },
};

export function getBadgeDefinition(badgeId: string): BadgeDefinition | null {
  return PLATFORM_BADGES[badgeId] || null;
}
