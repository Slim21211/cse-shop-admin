const testData = {
  rows: [
    {
      fullName: 'Владимир Давыдов',
      email: 'vladimir.davydov@cse.ru',
      points: 1000,
      reason: 'Тестовое начисление',
    },
  ],
};

fetch('http://localhost:3000/api/ispring-rewards', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
  .then((res) => res.json())
  .then((data) => {
    console.log('✅ Результат:', JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error('❌ Ошибка:', err.message);
  });
