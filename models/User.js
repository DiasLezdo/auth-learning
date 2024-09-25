const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = mongoose.Schema(
  {
    oauthId: { type: String, required: false },
    first_name: {
      type: String,
      require: [true, "Please Add a name"],
    },
    last_name: {
      type: String,
      require: false,
    },
    user_name: {
      type: String,
      required: false,
      unique: true,
    },
    email: {
      type: String,
      require: [true, "Please Add a email"],
      unique: true,
      // remove space around the email==>trim
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid emaial",
      ],
    },
    password: {
      type: String,
      // require: [true, "Please Add a password"], //if we face error when oauth register then remove require
      required: function () {
        return !this.oauthId;
      }, // The password is required only if the user does not have a googleId (non-OAuth users)
      minLength: [6, "password must be more than 6 characters"],
      // maxLength: [23, "password must be less than 23 characters"],
    },
    photo: {
      type: String,
      require: [true, "Please Add a photo"],
      default:
        "https://res.cloudinary.com/dz4augbi8/image/upload/v1727247993/o-auth-project/common/profile-icon-design-free-vector_bq04ym.jpg",
    },
    phone: {
      type: String,
      default: "+ ",
    },
    bio: {
      type: String,
      maxLength: [250, "Bio must not be more than 250 characters"],
      default: "Add bio",
    },
    role: {
      type: Number,
      default: 0,
    },
    account_type: {
      type: String,
      default: "PUBLIC",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    mfa: {
      type: Number,
      default: 0,
    },
    mfa_secret: {
      type: String,
      required: function () {
        return this.mfa == 2;
      },
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendRequests: [
      // {
      //   from:

      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // if we want log and condition based add friend -> we can use it
      // status: {
      //   type: String,
      //   enum: ["pending", "accepted", "declined"],
      //   default: "pending",
      // },
      // },
    ],
  },
  {
    timestamps: true,
  }
);

// //   Encrypt password before saving to DB

// userSchema.pre("save", async function (next) {
//   // below line only modify when password change otherwise like name ,email,phone those time dont change simply ignore it
//   // if this password not modify then i don't want to do anything just ignore next()
//   if (!this.isModified("password")) {
//     return next();
//   }

//   // Hash password
//   const salt = await bcrypt.genSalt(10);
//   const hashedPassword = await bcrypt.hash(this.password, salt);
//   this.password = hashedPassword;
//   next();
// });

// ------------------------- * * * * * * * * * * * * * * * * *------------------------------------------------------

// Generate a unique user_name based on first_name and hashing password togather
userSchema.pre("save", async function (next) {
  const user = this;

  // Hash password if it's modified
  if (user.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }

  // Generate user_name if not provided
  if (!user.user_name) {
    const baseUserName = user.first_name.toLowerCase().replace(/\s+/g, "");

    // Function to check if the generated user_name is unique
    const checkUniqueUserName = async (name, suffix = 0) => {
      const userName = suffix > 0 ? `${name}${suffix}` : name;
      const existingUser = await mongoose.models.User.findOne({
        user_name: userName,
      });
      if (existingUser) {
        return checkUniqueUserName(name, suffix + 1);
      }
      return userName;
    };

    // Assign the unique user_name
    user.user_name = await checkUniqueUserName(baseUserName);
  }

  next();
});

module.exports = mongoose.model("User", userSchema);
