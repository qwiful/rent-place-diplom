<script setup></script>

<template>
  <footer class="app-footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-col">
          <p class="footer-brand">БизнесЦентр.Ру</p>
          <p class="footer-copy">© 2025 Все права защищены</p>
        </div>
        <div class="footer-col">
          <p class="footer-contact">+7 (495) 123-45-67</p>
          <p>info@bizcenter.ru</p>
        </div>
        <div class="footer-col">
          <p>Ярославль, ул. Свободы, 12</p>
          <p>Пн–Пт 9:00–19:00</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: var(--color-white);
  border-top: 1px solid var(--color-border);
  margin-top: 48px;
  padding: 32px 0;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
}

.footer-col p {
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  font-size: 14px;
}

.footer-brand {
  font-weight: 600;
  color: var(--color-text) !important;
}

.footer-contact {
  font-weight: 500;
  color: var(--color-primary) !important;
}

.footer-copy {
  font-size: 13px !important;
}
</style>
