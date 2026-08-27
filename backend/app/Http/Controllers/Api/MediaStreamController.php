<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaStreamController extends Controller
{
    /**
     * Stream a video or audio file with full HTTP 206 Partial Content (Range) support.
     * This enables timeline seeking in browsers.
     */
    public function stream(Request $request, $path)
    {
        // Decode path in case of slashes or urlencoding
        $cleanPath = ltrim(str_replace(['../', '..\\'], '', urldecode($path)), '/');
        
        // Remove storage/ prefix if passed
        if (str_starts_with($cleanPath, 'storage/')) {
            $cleanPath = substr($cleanPath, 8);
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($cleanPath)) {
            abort(404, 'Media file not found');
        }

        $fullPath = $disk->path($cleanPath);
        $size = filesize($fullPath);
        $mime = mime_content_type($fullPath) ?: 'video/mp4';

        $start = 0;
        $end = $size - 1;
        $status = 200;
        $headers = [
            'Content-Type' => $mime,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'no-cache, private',
        ];

        if ($request->header('Range')) {
            $range = $request->header('Range');
            if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                $start = (int) $matches[1];
                if (!empty($matches[2])) {
                    $end = (int) $matches[2];
                }
                
                if ($start >= $size || $end >= $size || $start > $end) {
                    return response('', 416, [
                        'Content-Range' => "bytes */$size",
                    ]);
                }

                $status = 206;
                $headers['Content-Range'] = "bytes $start-$end/$size";
                $headers['Content-Length'] = $end - $start + 1;
            }
        } else {
            $headers['Content-Length'] = $size;
        }

        $response = new StreamedResponse(function () use ($fullPath, $start, $end) {
            $stream = fopen($fullPath, 'rb');
            if ($start > 0) {
                fseek($stream, $start);
            }

            $remaining = $end - $start + 1;
            $chunkSize = 1024 * 128; // 128 KB buffer

            while (!feof($stream) && $remaining > 0 && connection_status() === CONNECTION_NORMAL) {
                $read = min($chunkSize, $remaining);
                $buffer = fread($stream, $read);
                echo $buffer;
                flush();
                $remaining -= strlen($buffer);
            }

            fclose($stream);
        }, $status, $headers);

        return $response;
    }
}
