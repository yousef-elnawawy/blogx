<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PostCategorizerService
{
    /**
     * Allowed system categories
     */
    public const VALID_CATEGORIES = [
        'programming',
        'technology',
        'ai',
        'design',
        'gaming',
        'business',
        'science',
        'sports',
        'cooking',
        'general',
    ];

    /**
     * Local keyword dictionary for fast fallback (Arabic + English)
     */
    private const KEYWORD_TAXONOMY = [
        'programming' => [
            'برمجة', 'مبرمج', 'كود', 'جافاسكريبت', 'بايثون', 'بي اتش بي', 'لارافيل', 'رياكت', 'فريمورك',
            'ديفلوبمنت', 'خوارزمية', 'داتابيز', 'سيرفر', 'github', 'php', 'javascript', 'typescript',
            'react', 'nextjs', 'laravel', 'vue', 'python', 'java', 'c++', 'c#', 'rust', 'golang',
            'backend', 'frontend', 'fullstack', 'api', 'sql', 'mysql', 'postgres', 'docker', 'git', 'coding', 'code'
        ],
        'ai' => [
            'ذكاء اصطناعي', 'تعلم الالة', 'شات جي بي تي', 'chatgpt', 'openai', 'gemini', 'claude',
            'deepseek', 'llm', 'machine learning', 'deep learning', 'neural', 'prompt', 'nlp',
            'روبوت', 'توليد الصور', 'midjourney', 'stable diffusion', 'نماذج لغوية'
        ],
        'technology' => [
            'تقنية', 'تكنولوجيا', 'هاتف', 'ايفون', 'سامسونج', 'معالج', 'شاشة', 'اندرويد', 'ios',
            'تطبيق', 'سوفتوير', 'هاردوير', 'حاسوب', 'كمبيوتر', 'لابتوب', 'ابل', 'جوجل', 'مايكروسوفت',
            'tech', 'technology', 'smartphone', 'apple', 'google', 'microsoft', 'intel', 'amd', 'nvidia',
            'cybersecurity', 'امن سيبراني', 'تحديث', 'ابتكار'
        ],
        'design' => [
            'تصميم', 'ديزاين', 'واجهات', 'تجربة مستخدم', 'ui', 'ux', 'figma', 'photoshop', 'illustrator',
            'فوتوشوب', 'اليستريتور', 'الوان', 'تايبوجرافي', 'موشن جرافيك', '3d', 'blender', 'graphic design',
            'جرافيك', 'لوجو', 'شعار'
        ],
        'gaming' => [
            'العاب', 'قيمينق', 'جيمنج', 'بلايستيشن', 'اكسبوكس', 'نينتندو', 'playstation', 'xbox',
            'nintendo', 'steam', 'game', 'gaming', 'gamer', 'قيمر', 'فيفا', 'fifa', 'gta', 'fortnite',
            'ببجي', 'pubg', 'كول اوف ديوتي', 'cod', 'esports', 'بطولة العاب'
        ],
        'business' => [
            'بزنس', 'اعمال', 'اقتصاد', 'استثمار', 'ريادة اعمال', 'اسهم', 'بورصة', 'عملات', 'كريبتو',
            'بيتكوين', 'تسويق', 'مبيعات', 'تجارة', 'تمويل', 'ارباح', 'ستارتب', 'startup', 'crypto',
            'bitcoin', 'marketing', 'finance', 'stocks', 'economy', 'money', 'business'
        ],
        'sports' => [
            'رياضة', 'كرة قدم', 'مباراة', 'دوري', 'كاس', 'فريق', 'نادي', 'لاعب', 'هدف', 'ميسي',
            'رونالدو', 'ريال مدريد', 'برشلونة', 'ليفربول', 'الاهلي', 'الهلال', 'تنس', 'كرة سلة',
            'fitness', 'gym', 'football', 'soccer', 'champions league', 'nba', 'جيم', 'لياقة'
        ],
        'cooking' => [
            'طبخ', 'مطبخ', 'وصفة', 'اكل', 'طعام', 'شيف', 'وجبة', 'حلويات', 'عصير', 'مطعم',
            'recipe', 'cooking', 'food', 'chef', 'kitchen', 'delicious', 'baking', 'وصفات'
        ],
        'science' => [
            'علوم', 'علم', 'فيزياء', 'كيمياء', 'فلك', 'فضاء', 'ناسا', 'طب', 'صحة', 'علاج',
            'دواء', 'ابحاث', 'مختبر', 'طاقة', 'بيئة', 'science', 'physics', 'chemistry', 'astronomy',
            'space', 'nasa', 'medicine', 'health', 'biology'
        ],
    ];

    /**
     * Categorize post content seamlessly with AI & Fallback.
     */
    public function categorize(?string $content): string
    {
        $cleanContent = trim(strip_tags((string) $content));

        if (mb_strlen($cleanContent) < 3) {
            return 'general';
        }

        // 1. Attempt AI Categorization via Google Gemini API
        $apiKey = env('GEMINI_API_KEY') ?: config('services.gemini.key');
        if (!empty($apiKey)) {
            try {
                $category = $this->callGeminiApi($cleanContent, $apiKey);
                if ($category && in_array($category, self::VALID_CATEGORIES, true)) {
                    return $category;
                }
            } catch (\Throwable $e) {
                Log::warning('Gemini categorization failed, falling back to local taxonomy.', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // 2. Fallback to Local Taxonomy / Keyword Analysis
        return $this->fallbackCategorize($cleanContent);
    }

    /**
     * Call Google Gemini Flash API with strict timeout
     */
    private function callGeminiApi(string $content, string $apiKey): ?string
    {
        // Truncate content for token efficiency and fast response
        $truncatedText = mb_substr($content, 0, 1000);
        $allowedList = implode(', ', self::VALID_CATEGORIES);

        $prompt = "You are a backend content classifier. Classify the following text into exactly ONE category from this list: [{$allowedList}]. "
            . "Output JSON only in format: {\"category\": \"<one_category_name>\"}. "
            . "Text: \"{$truncatedText}\"";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $response = Http::timeout(3)
            ->retry(1, 100)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'maxOutputTokens' => 50,
                    'responseMimeType' => 'application/json',
                ]
            ]);

        if (!$response->successful()) {
            return null;
        }

        $body = $response->json();
        $responseText = $body['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $data = json_decode(trim($responseText), true);

        if (isset($data['category'])) {
            $cat = strtolower(trim((string) $data['category']));
            // Normalization map
            $aliasMap = [
                'ai & ml' => 'ai',
                'ai_ml' => 'ai',
                'tech' => 'technology',
                'games' => 'gaming',
                'sport' => 'sports',
                'food' => 'cooking',
                'coding' => 'programming',
                'dev' => 'programming',
            ];
            $cat = $aliasMap[$cat] ?? $cat;
            return $cat;
        }

        return null;
    }

    /**
     * Local keyword matching fallback
     */
    public function fallbackCategorize(string $content): string
    {
        $normalized = mb_strtolower($content);

        $categoryScores = [];
        foreach (self::KEYWORD_TAXONOMY as $category => $keywords) {
            $score = 0;
            foreach ($keywords as $keyword) {
                if (mb_stripos($normalized, $keyword) !== false) {
                    $score += 1;
                }
            }
            if ($score > 0) {
                $categoryScores[$category] = $score;
            }
        }

        if (empty($categoryScores)) {
            return 'general';
        }

        arsort($categoryScores);
        return array_key_first($categoryScores);
    }
}
