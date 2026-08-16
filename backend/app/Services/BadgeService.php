<?php

namespace App\Services;

use App\Models\User;

class BadgeService
{
    /**
     * Complete registry of all platform badges.
     */
    public static function getAvailableBadges(): array
    {
        return [
            [
                'id'                => 'pro_author',
                'name'              => 'Pro Author',
                'name_ar'           => 'كاتب محترف',
                'description'       => 'Published top quality articles and in-depth stories.',
                'description_ar'    => 'كاتب متميز ينشر مقالات وقصص متعمقة وعالية الجودة.',
                'icon_name'         => 'PenTool',
                'tier'              => 'epic',
                'gradient'          => 'from-amber-500 to-orange-600',
                'color'             => '#F59E0B',
                'requires_verified' => true,
            ],
            [
                'id'                => 'dev_guru',
                'name'              => 'Tech Pioneer',
                'name_ar'           => 'رائد تقني',
                'description'       => 'Leader and contributor in engineering and technology.',
                'description_ar'    => 'رائد ومساهم متميز في مجالات التقنية والبرمجيات.',
                'icon_name'         => 'Code2',
                'tier'              => 'epic',
                'gradient'          => 'from-emerald-500 to-teal-600',
                'color'             => '#10B981',
                'requires_verified' => true,
            ],
            [
                'id'                => 'community_champion',
                'name'              => 'Community Champion',
                'name_ar'           => 'بطل المجتمع',
                'description'       => 'Active community builder and influential participant.',
                'description_ar'    => 'عضو مؤثر ومساهم بارز في بناء ودعم مجتمع BlogX.',
                'icon_name'         => 'Crown',
                'tier'              => 'epic',
                'gradient'          => 'from-purple-500 to-indigo-600',
                'color'             => '#8B5CF6',
                'requires_verified' => true,
            ],
            [
                'id'                => 'vip_partner',
                'name'              => 'VIP Partner',
                'name_ar'           => 'شريك متميز',
                'description'       => 'Official organizational partner of the BlogX platform.',
                'description_ar'    => 'شريك تنفيذي ومؤسسي رسمي مع منصة BlogX.',
                'icon_name'         => 'Sparkles',
                'tier'              => 'legendary',
                'gradient'          => 'from-rose-500 to-pink-600',
                'color'             => '#F43F5E',
                'requires_verified' => true,
            ],
            [
                'id'                => 'trendsetter',
                'name'              => 'Trendsetter',
                'name_ar'           => 'صانع صيحات',
                'description'       => 'Content creator featured in trending feeds and viral discussions.',
                'description_ar'    => 'صانع أثر تظهر منشوراته باستمرار في قائمة الشائع.',
                'icon_name'         => 'Flame',
                'tier'              => 'rare',
                'gradient'          => 'from-red-500 to-orange-500',
                'color'             => '#EF4444',
                'requires_verified' => true,
            ],
            [
                'id'                => 'early_supporter',
                'name'              => 'Early Supporter',
                'name_ar'           => 'داعم مبكر',
                'description'       => 'Joined during BlogX foundation era.',
                'description_ar'    => 'انضم وساهم خلال فترة انطلاق منصة BlogX الأولى.',
                'icon_name'         => 'ShieldAlert',
                'tier'              => 'rare',
                'gradient'          => 'from-pink-500 to-rose-600',
                'color'             => '#EC4899',
                'requires_verified' => false,
            ],
            [
                'id'                => 'bug_hunter',
                'name'              => 'Bug Hunter',
                'name_ar'           => 'باحث أمني',
                'description'       => 'Helped identify issues and improve platform resilience.',
                'description_ar'    => 'ساهم في تحسين الأمان والإبلاغ عن الثغرات والملاحظات.',
                'icon_name'         => 'ShieldCheck',
                'tier'              => 'rare',
                'gradient'          => 'from-cyan-500 to-blue-500',
                'color'             => '#06B6D4',
                'requires_verified' => false,
            ],
        ];
    }

    /**
     * Sanitize and validate equipped badges for a user.
     * Non-verified users cannot equip badges requiring verification.
     */
    public static function sanitizeEquippedBadges(array $rawBadgeIds, bool $isVerified): array
    {
        $all = collect(self::getAvailableBadges())->keyBy('id');
        $sanitized = [];

        foreach ($rawBadgeIds as $id) {
            if (!is_string($id) || !$all->has($id)) {
                continue;
            }

            $badge = $all->get($id);
            if ($badge['requires_verified'] && !$isVerified) {
                continue;
            }

            if (!in_array($id, $sanitized)) {
                $sanitized[] = $id;
            }

            // Max 5 equipped badges concurrently
            if (count($sanitized) >= 5) {
                break;
            }
        }

        return $sanitized;
    }
}
