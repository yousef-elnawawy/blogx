<?php

namespace App\Services;

class DeviceDetector
{
    public static function detect(?string $userAgent): array
    {
        if (empty($userAgent)) {
            return [
                'browser' => 'Unknown Browser',
                'platform' => 'Unknown OS',
                'device_type' => 'desktop',
            ];
        }

        // Platform / OS
        $platform = 'Unknown OS';
        if (preg_match('/windows|win32/i', $userAgent)) {
            $platform = 'Windows';
        } elseif (preg_match('/macintosh|mac os x/i', $userAgent)) {
            $platform = 'macOS';
        } elseif (preg_match('/iphone/i', $userAgent)) {
            $platform = 'iOS (iPhone)';
        } elseif (preg_match('/ipad/i', $userAgent)) {
            $platform = 'iPadOS';
        } elseif (preg_match('/android/i', $userAgent)) {
            $platform = 'Android';
        } elseif (preg_match('/linux/i', $userAgent)) {
            $platform = 'Linux';
        }

        // Device type
        $deviceType = 'desktop';
        if (preg_match('/mobile|iphone|ipod|android.*mobile/i', $userAgent)) {
            $deviceType = 'mobile';
        } elseif (preg_match('/ipad|tablet|android(?!.*mobile)/i', $userAgent)) {
            $deviceType = 'tablet';
        }

        // Browser
        $browser = 'Unknown Browser';
        if (preg_match('/edg/i', $userAgent)) {
            $browser = 'Microsoft Edge';
        } elseif (preg_match('/chrome|crios/i', $userAgent)) {
            $browser = 'Google Chrome';
        } elseif (preg_match('/firefox|fxios/i', $userAgent)) {
            $browser = 'Mozilla Firefox';
        } elseif (preg_match('/safari/i', $userAgent) && !preg_match('/chrome/i', $userAgent)) {
            $browser = 'Apple Safari';
        } elseif (preg_match('/opera|opr/i', $userAgent)) {
            $browser = 'Opera';
        }

        return [
            'browser' => $browser,
            'platform' => $platform,
            'device_type' => $deviceType,
        ];
    }
}
