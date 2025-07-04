 const createUserForm = document.getElementById('create-user-form');

createUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value
