window.browser = (function() {
  return window.msBrowser || window.browser || window.chrome
})()

let HEADERS

window.browser.storage.sync.get(['token'], result => {
  HEADERS = new Headers({
    authorization: `bearer ${result.token}`,
  })
})

const BASE_API_URL = 'https://www.wrike.com/api/v4'
const KNOWN_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

async function getColumnsInfo(title) {
  const perColumn = {}
  const response = await fetch(`${BASE_API_URL}/workflows`, { headers: HEADERS })
  const data = await response.json()
  const workflow = data.data.find(workflow => workflow.name === title)
  for (const status of workflow.customStatuses) {
    perColumn[status.id] = {
      counter: {},
      name: status.name,
    }
  }
  return perColumn
}

async function getFolderInfo(title) {
  const response = await fetch(`${BASE_API_URL}/folders`, { headers: HEADERS })
  const data = await response.json()
  const folder = data.data.find(folder => folder.title === title)
  return folder.id
}

async function getTasksData(folderId) {
  const response = await fetch(`${BASE_API_URL}/folders/${folderId}/tasks`, { headers: HEADERS })
  const data = await response.json()
  return data.data
}

function fillColumnDataWithTasks(tasks, columnData) {
  const reg = /{([XSML]+)}/
  for (const task of tasks) {
    const match = reg.exec(task.title)
    if (match) {
      const size = match[1]
      if (columnData[task.customStatusId].counter.hasOwnProperty(size)) {
        columnData[task.customStatusId].counter[size] += 1
      } else {
        columnData[task.customStatusId].counter[size] = 1
      }
    }
  }

  return Object.values(columnData)
}

function objectToArray(obj) {
  const arr = []
  for (const key in obj) {
    arr.push([key, obj[key]])
  }
  return arr
}

function sortSizes(sizeData) {
  // Quadratic complexity but data set is super small so its ok
  // Sort sizes based on KNOW_SIZES array
  const sortedSizes = []

  KNOWN_SIZES.forEach(size => {
    let found = false
    sizeData = sizeData.filter(item => {
      if (!found && item[0] === size) {
        sortedSizes.push(item)
        found = true
        return false
      } else return true
    })
  })

  return sortedSizes
}

function displayData(columnData) {
  const titles = document.querySelectorAll('.boards-column-inner .title-text')
  for (const title of titles) {
    const data = columnData.find(column => column.name === title.innerText)
    if (!data) {
      continue
    }

    const sizesArray = objectToArray(data.counter)
    const sortedSizes = sortSizes(sizesArray)

    const container = document.createElement('div')
    container.classList.add('size-counter-container')

    for (const size of sortedSizes) {
      const element = document.createElement('span')
      element.innerText = `${size[0]}:${size[1]}`
      container.appendChild(element)
    }
    const insertBeforeThis = title.parentElement.parentElement.nextElementSibling
    if (insertBeforeThis) {
      insertBeforeThis.parentElement.insertBefore(container, insertBeforeThis)
    }
  }
}

async function main() {
  const title = document.querySelector('.header-title__main').innerText
  const columnsPromise = getColumnsInfo(title)
  const folderPromise = getFolderInfo(title)
  const folderId = await folderPromise
  const tasks = await getTasksData(folderId)
  let columnData = await columnsPromise

  columnData = fillColumnDataWithTasks(tasks, columnData)

  displayData(columnData)
}

const interval = setInterval(async () => {
  if (document.readyState === 'complete' && !!document.querySelector('.header-title__main') && !!HEADERS) {
    clearInterval(interval)
    await main()
  }
}, 50)
