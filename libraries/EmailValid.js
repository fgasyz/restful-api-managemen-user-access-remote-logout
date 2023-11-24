const EmailValid = (email) => {
  return /[a-z0-9]+@[a-z]+\.[a-z]{2,3}/.test(email);
};

export default EmailValid;
