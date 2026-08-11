<?php

namespace App\Services;

class TotpService
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a random base32 secret (160 bits / 20 bytes => 32 base32 chars).
     */
    public static function generateSecret(int $length = 32): string
    {
        $secret = '';
        $max = strlen(self::BASE32_CHARS) - 1;
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_CHARS[random_int(0, $max)];
        }
        return $secret;
    }

    /**
     * Generate otpauth URI for QR code generation.
     */
    public static function getOtpAuthUrl(string $company, string $account, string $secret): string
    {
        $company = rawurlencode($company);
        $account = rawurlencode($account);
        return "otpauth://totp/{$company}:{$account}?secret={$secret}&issuer={$company}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Calculate TOTP code for a secret at a given timestamp.
     */
    public static function calculateCode(string $secret, ?int $timestamp = null, int $digits = 6, int $period = 30): string
    {
        $timestamp = $timestamp ?? time();
        $timeSlice = (int) floor($timestamp / $period);

        $secretKey = self::base32Decode($secret);
        $timeBytes = pack('N*', 0) . pack('N*', $timeSlice);

        $hash = hash_hmac('sha1', $timeBytes, $secretKey, true);
        $offset = ord(substr($hash, -1)) & 0x0F;

        $binary = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        );

        $otp = $binary % (10 ** $digits);
        return str_pad((string) $otp, $digits, '0', STR_PAD_LEFT);
    }

    /**
     * Verify a TOTP code within a window of tolerance (+/- 1 step).
     */
    public static function verifyCode(string $secret, string $code, int $window = 1, ?int $timestamp = null): bool
    {
        $timestamp = $timestamp ?? time();
        $code = trim($code);

        for ($i = -$window; $i <= $window; $i++) {
            $checkTime = $timestamp + ($i * 30);
            if (hash_equals(self::calculateCode($secret, $checkTime), $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Base32 decode helper.
     */
    private static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
        $buffer = 0;
        $bitsLeft = 0;
        $output = '';

        for ($i = 0; $i < strlen($b32); $i++) {
            $val = strpos(self::BASE32_CHARS, $b32[$i]);
            if ($val === false) {
                continue;
            }

            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;

            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $output;
    }
}
