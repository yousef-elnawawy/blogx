<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\Api\MediaStreamController;

Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

Route::get('/media/stream/{path}', [MediaStreamController::class, 'stream'])->where('path', '.*');
Route::get('/api/media/stream/{path}', [MediaStreamController::class, 'stream'])->where('path', '.*');


