# Запуск

1. Клонировать репозиторий:

```bash
git clone https://github.com/qwiful/rent-place-diplom.git
```

2. Перейти в папку проекта:

```bash
cd rent-place-diplom
```

3. Установить зависимости:

```bash
cd backend && npm install
cd ../frontend && npm install
```

4. Применить схему Prisma к БД и заполнить тестовыми данными:

```bash
cd backend && npx prisma generate
npx prisma db push
node seed.js
```

5. Запустить бэкенд и фронтенд (в разных терминалах):

```bash
# Терминал 1 - бэкенд
cd backend
npm run dev

# Терминал 2 - фронтенд
cd frontend
npm run dev
```

6. Открыть: http://localhost:5173/
