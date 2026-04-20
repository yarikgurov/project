<?php
require_once 'csrf_protection.php';

try {
    $pdo = new PDO('sqlite:notes.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        title TEXT, 
        body TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
} catch (PDOException $e) {
    die("Ошибка БД: " . $e->getMessage());
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    if (!Csrf::validate($_POST['csrf_token'] ?? '')) {
        header('HTTP/1.1 403 Forbidden');
        die("<h1>403 Forbidden</h1><p>Защита CSRF: Токен не прошел проверку.</p>");
    }

    $title = trim($_POST['title'] ?? '');
    $body = trim($_POST['body'] ?? '');

    if (!empty($title)) {
        $stmt = $pdo->prepare('INSERT INTO notes (user_id, title, body) VALUES (1, ?, ?)');
        $stmt->execute([$title, $body]);
        
        header('Location: ' . $_SERVER['PHP_SELF']); 
        exit;
    }
}

$notes = $pdo->query('SELECT * FROM notes ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Заметки с защитой</title>
    <style>
        body { font-family: sans-serif; max-width: 500px; margin: 40px auto; background: #fafafa; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; }
        input, textarea { width: 100%; margin: 10px 0; padding: 10px; box-sizing: border-box; }
        button { background: #333; color: #fff; border: none; padding: 10px; width: 100%; cursor: pointer; }
        .note { border-bottom: 1px solid #eee; padding: 10px 0; }
    </style>
</head>
<body>

    <div class="card">
        <h2>Новая заметка</h2>
        <form action="<?= $_SERVER['PHP_SELF'] ?>" method="POST">
            <?php Csrf::embed(); ?>
            
            <input type="text" name="title" placeholder="Заголовок" required>
            <textarea name="body" placeholder="Текст..."></textarea>
            <button type="submit">Сохранить заметку</button>
        </form>
    </div>

    <div class="card">
        <h2>Архив</h2>
        <?php foreach ($notes as $note): ?>
            <div class="note">
                <strong><?= htmlspecialchars($note['title']) ?></strong>
                <p><?= nl2br(htmlspecialchars($note['body'])) ?></p>
            </div>
        <?php endforeach; ?>
    </div>

</body>
</html>