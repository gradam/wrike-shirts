window.browser = (function() {
  return window.msBrowser || window.browser || window.chrome
})()

// Saves options to chrome.storage
function save_options() {
  const token = document.getElementById('token').value
  window.browser.storage.sync.set(
    {
      token: token,
    },
    function() {
      // Update status to let user know options were saved.
      var status = document.getElementById('status')
      status.textContent = 'Options saved.'
      setTimeout(function() {
        status.textContent = ''
      }, 750)
    }
  )
}

window.browser.storage.sync.get(['token'], result => {
  document.getElementById('token').value = result.token
})

document.getElementById('save').addEventListener('click', save_options)
