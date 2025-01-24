const getName = (url) =>{
    // Find the part between 'problems' and 'description'
    const start = url.indexOf('problems') + 'problems'.length + 1; // Adding 1 to skip the '/'
    const end = url.indexOf('description');
    let pName;
    if(url.slice(start, end)[start-end-1]=='/'){
        pName = url.slice(start, end-1);
    }
    else{
        pName = url.slice(start, end);
    }

    return pName;
};

module.exports = {getName}

// 2 7