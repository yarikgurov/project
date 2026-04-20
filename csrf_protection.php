<?php
session_start();

// Класс для защиты форм от CSRF-атак. 
// Генерирует секретный ключ и сверяет его при отправке данных.
class Csrf {
    
    // Создаем случайный токен и пишем в сессию, чтобы он не менялся при обновлении страницы
    public static function generate() {
        if (empty($_SESSION['csrf_token'])) {
            // Используем random_bytes для максимальной стойкости к подбору
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    // Сравниваем токен из формы с тем, что лежит в сессии на сервере
    public static function validate($inputToken) {
        // hash_equals защищает от атак по времени 
        return (isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $inputToken));
    }

    // Удобный метод для быстрой вставки скрытого поля в любую форму
    public static function embed() {
        echo "<input type='hidden' name='csrf_token' value='" . self::generate() . "'>";
    }
}