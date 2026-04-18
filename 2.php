<?php
// Задание 1: 
$age = 22;

echo "=== Задание 1 ===<br>";
if ($age >= 18 && $age <= 35) {
    echo "Счастливчик!<br><br>";
} elseif ($age >= 1 && $age <= 17) {
    echo "Слишком молод<br><br>";
} else {
    echo "Не повезло<br><br>";
}

// Задание 2: 
echo "=== Задание 2 ===<br>";
$evenNumbers = array();

for ($i = 2; $i <= 100; $i += 2) {
    $evenNumbers[] = $i;
}

foreach ($evenNumbers as $num) {
    if ($num % 5 == 0) {
        echo $num . " ";
    }
}
echo "<br><br>";

// Задание 3: 
echo "=== Задание 3 ===<br>";
$info = array(
    "Name" => "Анна",
    "Address" => "ул. Ленина, 10",
    "Phone" => "+7 (123) 456-78-90",
    "Mail" => "anna@mail.com"
);

foreach ($info as $element => $value) {
    echo "$element: $value<br>";
}
?>