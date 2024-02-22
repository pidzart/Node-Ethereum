this.eth = {
  stateAt: function (address, key) {
    var request = new XMLHttpRequest();
    // `false` makes the request synchronous
    request.open('GET', '_etherApi/stateAt/?address=' + address + '&key=' + key, false);
    request.send(null);

    if (request.status === 200) {
      console.log(request.responseText);
    }
  },
  secretToAddress: function () {},
  keys: []
};
