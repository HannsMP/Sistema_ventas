$('.content-body').ready(async () => {

  let history = [];
  let position = -1;

  /*
    ==================================================
    ======================= DOM =======================
    ==================================================
  */

  let cardCores = document.getElementById('card-cmd');
  let downloadBtn = cardCores.querySelector('.card-head .btn-info');
  let clearBtn = cardCores.querySelector('.card-head .btn-danger');
  let codeBox = cardCores.querySelector('.card-body .code');
  let codePath = cardCores.querySelector('.card-body .input-path');
  let codeCommand = cardCores.querySelector('.card-body .input-code');
  let codeBtn = cardCores.querySelector('.card-body .input-btn');

  let codeCmd = new Code('.bash', codeBox);
  let sugCmd = new Suggestion(codeCommand, /cd\s+((\.{0,2}\/)?\S*)$/);

  downloadBtn.addEventListener('click', _ => codeCmd.download(`${Date.now()}.text`));

  /*
    ==================================================
    ====================== INIT ======================
    ==================================================
  */


  /** @typedef {{cmd:string, code:number, killed:boolean, signal}} ExecException */
  /** @returns {Promise<{path:string, result:string, errCmd:string, execException: ExecException }>} */
  let queryCmd = (path = '', command = '') => new Promise(res => {
    socket.emit('/query/cmd', path, command, (err, result) => {
      if (err)
        alarm.error(err);
      res(result);
    });
  })

  let Clear = async _ => {
    codeCommand.disabled = true;

    codeCmd.addEnd(`
 ______   ______   ______   __   __   ______   ______       ______  __
/\\  __ \\ /\\  == \\ /\\  __ \\ /\\ "-.\\ \\ /\\  ___\\ /\\  ___\\     /\\  == \\/\\ \\
\\ \\ \\/\\ \\\\ \\  __< \\ \\  __ \\\\ \\ \\-.  \\\\ \\ \\__ \\\\ \\  __\\     \\ \\  _-/\\ \\ \\
 \\ \\_____\\\\ \\_\\ \\_\\\\ \\_\\ \\_\\\\ \\_\\\\"\\_\\\\ \\_____\\\\ \\_____\\    \\ \\_\\   \\ \\_\\
  \\/_____/ \\/_/ /_/ \\/_/\\/_/ \\/_/ \\/_/ \\/_____/ \\/_____/     \\/_/    \\/_/

    `, 'bright-orange', true);

    let { path, dir } = await queryCmd();

    codePath.value = path;
    sugCmd.push(dir);

    socket.emit('/os/cmd', OsData => {
      let { distro, arch, hostname, kernel } = OsData;
      codeCmd.addEnd(`${distro} - ${arch} | ${hostname} - ${kernel} \n\n`);

      codeCommand.disabled = false;
      codeCommand.focus();
    });
  }
  clearBtn.addEventListener('click', _ => {
    codeCmd.empty();
    Clear();
  })
  Clear();

  /*
    ==================================================
    ====================== SEND ======================
    ==================================================
  */

  let Enter = async _ => {
    let pathVal = codePath.value;
    let commandVal = codeCommand.value;

    if (!commandVal || commandVal == '' || /^\s/.test(commandVal)) return;

    codeCmd.addEnd(`${pathVal} >> ${commandVal}`, 'bright-ligthblue');

    history.push(commandVal);
    position++;

    let { path, result, errCmd, execException, dir } = await queryCmd(pathVal, commandVal);

    codeCommand.value = '';
    inputBash(codeCommand);

    errCmd && codeCmd.addEnd(errCmd, 'bright-red');

    if (execException)
      return codeCmd.addEnd(execException.cmd.replace(/^.+(\&\&|\|\|)\s+/, ''), 'bright-red');

    result && codeCmd.addEnd(result);

    codePath.value = path;

    sugCmd.push(dir);
  }

  codeBtn.addEventListener('click', Enter)

  /*
    ==================================================
    ====================== SEND ======================
    ==================================================
  */

  document.addEventListener('keydown', ({ key }) => {
    if (key == 'ArrowUp') {
      if (!history[position]) return
      codeCommand.value = history[position];
      position = Math.max(position - 1, 0)
      return inputBash(codeCommand);
    }
    if (key == 'ArrowDown') {
      if (!history[position]) return
      codeCommand.value = history[position];
      position = Math.min(position + 1, history.length - 1)
      return inputBash(codeCommand);
    }
    if (key == 'Enter')
      return Enter();
  })
})