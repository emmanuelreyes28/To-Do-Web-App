//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//connect to mongoose db
mongoose.connect("mongodb+srv://admin-emmanuel:Test123@cluster0.mnfnjpg.mongodb.net/todolistDB");

//create mongoose schema
const itemSchema = {
  name: String,
};

//create mongoose model (note: mongoose model name should be capitalized)
//Item model will be the default lists of items if a new item is added to the Today list aka root route then it can be found within this collection 
const Item = mongoose.model("Item", itemSchema);

//create documents using model
const itemOne = new Item({name: "Buy Food"});
const itemTwo = new Item({name: "Study"});
const itemThree = new Item({name: "Workout"});

//array of documents
const defaultItems = [itemOne, itemTwo, itemThree];

//listSchema will hold docs of to do lists 
//for every new list created it will have a name and an array of items to do associated with that list
const listSchema = {
  name: String,
  items: [itemSchema]
}

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  //render items from db to route
  Item.find({}, function(err, foundItems){
    //check if items db collection is empty, if so save default data
    if(foundItems.length === 0){
      //insert array of documents to Item db model using insertMany()
      Item.insertMany(defaultItems, function(err){
        if(err){
          console.log(err)
        } else{
          console.log("Successfully uploaded documents to Items db");
        }
      });
      //redirect to root route after default items have been added to db; will fall in else case
      res.redirect("/");
    } else{
      //render list.ejs with given values 
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });

  
});


app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  //create new document when new to do is added to list
  const item = new Item({name: itemName});

  //check if item trying to be added was to default list 
  if(listName === "Today"){
    //save new document to item collection 
    item.save();
    //redirect to root route to render items 
    res.redirect("/");
  } else{
    //find custom list that is not the default list 
    List.findOne({name: listName}, function(err, foundList){
      //add new item to specified list 
      foundList.items.push(item);
      foundList.save();
      //redirect to route with specified list name to update to do list
      //which calls app.get("/:customListName")
      res.redirect("/" + listName);
    })
  }
});

app.post("/delete", function(req, res){
  //store item id from list.ejs
  const checkedItemId = req.body.checkbox;
  //store list name from list.ejs
  const listName = req.body.listName;

  //check if list name is default list Today
  if(listName === "Today"){
    //remove item selected from to do list
    Item.findByIdAndRemove(checkedItemId, function(err){
      if(err){
        console.log(err);
      } else{
        console.log("Successfully removed item from collection");
        //redirect to root route to update to do list
        res.redirect("/");
      }
    });
  } else{
    //use the following method to find specified listName in lists collection and update by pulling the item from that document's array of items using _id
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if(!err){
        //redirect to specified list to refresh/update to do list 
        res.redirect("/" + listName);
      }
    })
  }

  
});

//dynamic routes with expressjs to create new lists and load previous lists
app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({"name": customListName}, function(err, foundList){
    if(!err){
      if(!foundList){
        //create new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
      
        list.save(function(){
          //redirect to route once new list is created
          //default items will be populated within this new list
          res.redirect("/" + customListName);
        });
      } else{
        //show an existsing list 
        console.log(foundList.name);
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });

  
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});


//Why does Today list not show in db?
//We never create a new list called today but it still stores all default and new items being added
//it seems like it stores the new items to the items collection rather than create a new doc with lists collections since it is the default list 