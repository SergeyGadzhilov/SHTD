function Db() {
  const self = this;

  self.save = function (data) {
    localStorage.setItem("shtd", data);
  };

  self.loadTodo = function () {
    return localStorage.getItem("shtd");
  };
}

function Task(name) {
  const self = this;
  let _name = name;
  let _time = new Date(0);
  let _limit = new Date(300000);

  self.getName = function () {
    return _name;
  };

  self.updateTime = function (time) {
    _time = time;
    if (_limit.getTime() > 0 && _limit <= time) {
      let audio = new Audio("./sounds/bell.mp3");
      audio.play();
      _limit = new Date(0);
    }
  };

  self.getLimit = function () {
    return _limit;
  };

  self.clearLimit = function () {
    _limit = new Date(0);
  };

  self.getTime = function () {
    return _time;
  };

  self.serialize = function () {
    return JSON.stringify({
      name: _name,
      limit: _limit.getTime(),
      time: _time.getTime(),
    });
  };

  self.deserialize = function (data) {
    const task = JSON.parse(data);
    _name = task.name;
    _limit = new Date(task.limit);
    _time = new Date(task.time);
  };

  self.isEqual = function (task) {
    return task.getName() === _name;
  };
}

function Tasks() {
  const self = this;
  let _tasks = [];

  self.add = function (task) {
    _tasks.push(task);
  };

  self.remove = function (task) {
    const index = _tasks.findIndex((item) => {
      return item.isEqual(task);
    });

    if (index > -1) {
      _tasks.splice(index, 1);
    }
  };

  self.serialize = function () {
    const tasks = [];
    for (const item of _tasks) {
      tasks.push(item.serialize());
    }
    return JSON.stringify(tasks);
  };

  self.desirialize = function (data) {
    _tasks = [];
    const todos = JSON.parse(data);
    if (todos) {
      for (const task of todos) {
        const item = new Task("");
        item.deserialize(task);
        _tasks.push(item);
      }
    }
  };

  self.asArray = function () {
    return _tasks;
  };
}

function DbTasks() {
  const self = this;
  let _tasks = new Tasks();
  const _db = new Db();

  self.add = function (task) {
    _tasks.add(task);
    self.save();
  };

  self.remove = function (task) {
    _tasks.remove(task);
    self.save();
  };

  self.asArray = function () {
    return _tasks.asArray();
  };

  function loadTasks() {
    _tasks.desirialize(_db.loadTodo());
  }

  self.save = function () {
    _db.save(_tasks.serialize());
  };

  loadTasks();
}

function TaskDescription(task) {
  const _close = document.createElement("span");
  _close.innerHTML = "\u00d7";

  const _control = document.createElement("div");
  _control.innerHTML = task.getName();
  _control.appendChild(_close);

  _close.onclick = function () {
    const event = new CustomEvent("removeTask");
    _control.dispatchEvent(event);
  };

  return _control;
}

function TaskListItem(task) {
  const self = this;
  const _task = task;
  const _actions = new TaskActions(task);
  const _taskDescription = TaskDescription(task);
  const _timer = new TimerControl(task);
  _taskDescription.appendChild(_timer.getControl());

  const _control = document.createElement("li");
  _control.appendChild(_taskDescription);
  _control.appendChild(_actions.getControl());
  _control.classList.add("tasks_view__item");

  self.onRemove = function (callback) {
    if (callback) {
      _taskDescription.addEventListener("removeTask", () => {
        callback(self);
      });
    }
  };

  self.onUpdate = function (callback) {
    if (callback) {
      _control.addEventListener("taskUpdated", callback);
    }
  };

  self.getTask = function () {
    return _task;
  };

  self.getControl = function () {
    return _control;
  };

  _taskDescription.onclick = function () {
    if (_control.classList.contains("tasks_view__item-checked")) {
      _actions.hide();
    } else {
      _actions.show();
    }
  };

  _actions.getControl().addEventListener("startTask", () => {
    _timer.start();
    _control.dispatchEvent(new CustomEvent("taskUpdated"));
  });

  _actions.getControl().addEventListener("pauseTask", () => {
    _timer.pause();
    _control.dispatchEvent(new CustomEvent("taskUpdated"));
  });

  _actions.getControl().addEventListener("resumeTask", () => {
    _timer.resume();
    _control.dispatchEvent(new CustomEvent("taskUpdated"));
  });

  _control.onclick = function () {
    if (_control.classList.contains("tasks_view__item-checked")) {
      _control.classList.remove("tasks_view__item-checked");
    } else {
      _control.classList.add("tasks_view__item-checked");
    }
  };
}

function TaskList() {
  const self = this;
  let _tasks = new DbTasks();
  const _control = document.querySelector("#list-container");

  self.add = function (task) {
    if (task && task.getName()) {
      _tasks.add(task);
      showTask(task);
    }
  };

  function showTask(task) {
    const item = new TaskListItem(task);
    item.onRemove(self.remove);
    item.onUpdate(_tasks.save);
    _control.appendChild(item.getControl());
  }

  self.remove = function (item) {
    item.getControl().remove();
    _tasks.remove(item.getTask());
  };

  function showTasks() {
    for (const task of _tasks.asArray()) {
      showTask(task);
    }
  }

  showTasks();
}

function Timer(time) {
  const self = this;
  let _callback = null;
  let _interval = null;
  let _time = time ? time.getTime() : 0;
  let _start = new Date();

  self.start = function () {
    _start = Date.now();
    self.resume();
  };

  self.resume = function () {
    _start = Date.now() - _time;
    _interval = setInterval(function () {
      _time = Date.now() - _start;
      if (_callback) {
        _callback(new Date(_time));
      }
    }, 1000);
  };

  self.pause = function () {
    clearInterval(_interval);
  };

  self.onEvent = function (callback) {
    _callback = callback;
  };
}

function TaskActions(task) {
  const self = this;
  const _control = document.createElement("div");
  _control.classList.add("task_timer");

  const start =
    task.getTime() > new Date(0)
      ? createButton("Resume")
      : createButton("Start");

  start.onclick = function (e) {
    if (start.innerText === "Start") {
      _control.dispatchEvent(new CustomEvent("startTask"));
      start.innerText = "Pause";
    } else if (start.innerText === "Pause") {
      _control.dispatchEvent(new CustomEvent("pauseTask"));
      start.innerText = "Resume";
    } else {
      _control.dispatchEvent(new CustomEvent("resumeTask"));
      start.innerText = "Pause";
    }
  };

  _control.appendChild(start);

  function createButton(label) {
    const button = document.createElement("button");
    button.innerText = label;
    button.classList.add("task_timer__button");
    return button;
  }

  self.show = function () {
    _control.classList.add("task_timer-active");
  };

  self.hide = function () {
    _control.classList.remove("task_timer-active");
  };

  self.getControl = function () {
    return _control;
  };
}

function TimerControl(task) {
  const self = this;
  const _task = task;
  const _timer = new Timer(task.getTime());
  const _timeControl = document.createElement("span");
  _timeControl.classList.add("task_time");

  self.getControl = function () {
    return _timeControl;
  };

  self.start = function () {
    _timer.start();
  };

  self.resume = function () {
    _timer.resume();
  };

  self.pause = function () {
    _timer.pause();
  };

  _timer.onEvent(update);

  function update(time) {
    _task.updateTime(time);
    const hours = format(time.getUTCHours());
    const minutes = format(time.getUTCMinutes());
    const seconds = format(time.getUTCSeconds());
    _timeControl.innerText = `${hours}:${minutes}:${seconds}`;
  }

  function format(data) {
    if (data < 10) {
      return `0${data}`;
    }
    return `${data}`;
  }

  update(_task.getTime());
}

function Application() {
  const _input = document.querySelector("#input-task");
  const _button = document.querySelector("#add-task");
  const _list = new TaskList();

  function add() {
    _list.add(new Task(_input.value));
    _input.value = "";
  }

  if (_button) {
    _button.onclick = add;
  }

  if (_input) {
    _input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        add();
      }
    });
  }
}

const app = new Application();
