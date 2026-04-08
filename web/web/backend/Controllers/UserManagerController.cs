using Microsoft.AspNetCore.Mvc;


[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly AppDbContext _context;

    public UserController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/User
    [HttpGet]
    public IActionResult GetAllUsers()
    {
        var users = _context.UsersWeb.ToList();
        return Ok(users);
    }
    [HttpPut("lock/{username}")]
public IActionResult Lock(string username)
{
    var user = _context.UsersWeb.Find(username);

    if (user == null)
        return NotFound();

    user.Status = "Locked";
    _context.SaveChanges();

    return Ok();
}
[HttpPut("unlock/{username}")]
public IActionResult Unlock(string username)
{
    var user = _context.UsersWeb.Find(username);

    if (user == null)
        return NotFound();

    user.Status = "Active";
    _context.SaveChanges();

    return Ok();
}
[HttpPut("{username}")]
public IActionResult Update(string username, UserWeb updatedUser)
{
    var user = _context.UsersWeb.Find(username);

    if (user == null)
        return NotFound();

    user.Email = updatedUser.Email;
    user.Phone = updatedUser.Phone;
    user.UserRole = updatedUser.UserRole;
    user.Status = updatedUser.Status;
    _context.SaveChanges();

    return Ok(user);
}
[HttpPost]
public IActionResult CreateUser([FromBody] UserWeb user)
{
    user.HashPass = BCrypt.Net.BCrypt.HashPassword(user.HashPass);

    _context.UsersWeb.Add(user);
    _context.SaveChanges();

    return Ok(user);
}
}