<?php
$age = 20; 

if ($age >= 18 && $age <= 35) {
    echo "Счастливчик!";
} elseif ($age >= 1 && $age <= 17) {
    echo "Слишком молод";
} else {
    echo "Не повезло";
}
?>