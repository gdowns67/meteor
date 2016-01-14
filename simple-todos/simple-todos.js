Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
    Meteor.publish("tasks", function () {
        return Tasks.find({
            $or: [
              //{ private: { $ne: true } },
              { owner: this.userId }
            ]
        });
    });
}

if (Meteor.isClient) {
    Meteor.subscribe("tasks");
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
    // This code only runs on the client
    Template.body.helpers({
        tasks: function () {
            if (Session.get("hideCompleted")) {
                // If hide completed is checked, filter tasks
                return Tasks.find({ checked: { $ne: true } }, { sort: { createdAt: -1 } });
            } else {
                // Otherwise, return all of the tasks
                return Tasks.find({}, { sort: { createdAt: -1 } });
            }
        },
        incompleteCount: function () {
            return Tasks.find({ checked: { $ne: true } }).count();
        }
    });
    Template.body.events({
        "submit .new-task": function (event) {
            // Prevent default browser form submit
            event.preventDefault();
            var text = event.target.text.value;
            if (text) {
                Meteor.call("addTask", text);
                event.target.text.value = "";
            }
        },
        "change .hide-completed input": function (event) {
            Session.set("hideCompleted", event.target.checked);
        }
    });
    Template.task.helpers({
        isOwner: function () {
            return this.owner === Meteor.userId();
        }
    });
    Template.task.events({
        "click .toggle-checked": function () {
            Meteor.call("setChecked", this);
        },
        "click .delete": function () {
            Meteor.call("deleteTask", this);
        },
        "click .toggle-private": function () {
            Meteor.call("setPrivate", this, !this.private);
        }
    });
}

Meteor.methods({
    addTask: function (text) {
        // Make sure the user is logged in before inserting a task
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        Tasks.insert({
            text: text,
            createdAt: new Date(),
            owner: Meteor.userId(),
            username: Meteor.user().username
        });
    },
    deleteTask: function (task) {
        if (task.private && task.owner !== Meteor.userId()) {
            // If the task is private, make sure only the owner can delete it
            throw new Meteor.Error("not-authorized");
        }
        Tasks.remove(task._id);
    },
    setChecked: function (task) {
        if (task.private && task.owner !== Meteor.userId()) {
            // If the task is private, make sure only the owner can delete it
            throw new Meteor.Error("not-authorized");
        }
        Tasks.update(task._id, {
            $set: { checked: !task.checked }
        });
    },
    setPrivate: function (task, setToPrivate) {
        var task = Tasks.findOne(task._id);

        // Make sure only the task owner can make a task private
        if (task.owner !== Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.update(task._id, { $set: { private: setToPrivate } });
    }
});
